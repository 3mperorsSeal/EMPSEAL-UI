// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../interface/IEmpsealRouter.sol";
import "../interface/IAdapter.sol";
import "../interface/IERC20.sol";
import "../interface/IWETH.sol";
import "../lib/SafeERC20.sol";
import "../lib/Maintainable.sol";
import "../lib/EmpsealViewUtils.sol";
import "../lib/Recoverable.sol";
import "../interface/IEmpsealStructs.sol";

/**
 * @title EmpsealRouterLiteFinal
 * @notice Gas-optimized router with off-chain pathfinding
 * @dev Supports both Standard Split and Converge Split strategies
 */
contract EmpsealRouterLiteFinal is Maintainable, Recoverable, IEmpsealRouter, IEmpsealStructs {
    using SafeERC20 for IERC20;
    using OfferUtils for Offer;

    address public immutable WNATIVE;
    address public constant NATIVE = address(0);
    uint256 public constant FEE_DENOMINATOR = 1e4;
    uint256 public MIN_FEE = 0;
    address public FEE_CLAIMER;

    // Kept for view compatibility
    address[] public TRUSTED_TOKENS;
    address[] public ADAPTERS;

    mapping(address => bool) public isAuthorizedExtension;

    event ExtensionExecuted(address indexed user, address indexed extension, address tokenIn, uint256 amountIn);

    // Structs for the Converge Strategy
    struct Hop {
        address adapter;
        uint256 proportion; // Base 10000
        bytes data;
    }

    struct ConvergeTrade {
        address tokenIn;
        address intermediate;
        address tokenOut;
        uint256 amountIn;
        Hop[] inputHops;
        Hop outputHop;
    }

    constructor(
        address[] memory _adapters,
        address[] memory _trustedTokens,
        address _feeClaimer,
        address _wrapped_native
    ) {
        setAllowanceForWrapping(_wrapped_native);
        setTrustedTokens(_trustedTokens);
        setFeeClaimer(_feeClaimer);
        setAdapters(_adapters);
        WNATIVE = _wrapped_native;
    }

    // -- SETTERS & ADMIN --
    function setAllowanceForWrapping(address _wnative) public onlyMaintainer {
        IERC20(_wnative).safeApprove(_wnative, type(uint256).max);
    }
    function setTrustedTokens(address[] memory _trustedTokens) public override onlyMaintainer {
        TRUSTED_TOKENS = _trustedTokens;
    }
    function setAdapters(address[] memory _adapters) public override onlyMaintainer {
        ADAPTERS = _adapters;
    }
    function setMinFee(uint256 _fee) external override onlyMaintainer {
        MIN_FEE = _fee;
    }
    function setFeeClaimer(address _claimer) public override onlyMaintainer {
        FEE_CLAIMER = _claimer;
    }
    function setExtensionStatus(address _extension, bool _status) external onlyMaintainer {
        isAuthorizedExtension[_extension] = _status;
    }

    // -- HELPERS --
    receive() external payable {}

    function _applyFee(uint256 _amountIn, uint256 _fee) internal view returns (uint256) {
        require(_fee >= MIN_FEE, "Fee too low");
        return (_amountIn * (FEE_DENOMINATOR - _fee)) / FEE_DENOMINATOR;
    }

    function _wrap(uint256 _amount) internal {
        IWETH(WNATIVE).deposit{ value: _amount }();
    }

    function _unwrap(uint256 _amount) internal {
        IWETH(WNATIVE).withdraw(_amount);
    }

    function _transferFrom(address token, address _from, address _to, uint _amount) internal {
        if (_from != address(this)) IERC20(token).safeTransferFrom(_from, _to, _amount);
        else IERC20(token).safeTransfer(_to, _amount);
    }

    function _returnTokensTo(address _token, uint256 _amount, address _to) internal {
        if (address(this) != _to) {
            if (_token == NATIVE) {
                payable(_to).transfer(_amount);
            } else {
                IERC20(_token).safeTransfer(_to, _amount);
            }
        }
    }

    // =============================================================
    // STRATEGY 1: CONVERGE SWAP (Split -> Merge)
    // =============================================================

    /**
     * @notice Executes the "Split -> Merge" strategy
     * @dev Splits input across multiple adapters to intermediate token, then merges to output
     */
    function executeConvergeSwap(
        ConvergeTrade calldata _trade,
        uint256 _minAmountOut,
        address _to,
        uint256 _fee
    ) external payable returns (uint256) {
        uint256 amountIn = _trade.amountIn;
        address from = msg.sender;

        // Handle native wrapping
        if (_trade.tokenIn == WNATIVE && msg.value > 0) {
            require(msg.value == amountIn, "Value mismatch");
            _wrap(amountIn);
            from = address(this);
        }

        // Apply fee ONCE before splitting
        if (_fee > 0) {
            uint256 feeAmount = amountIn - _applyFee(amountIn, _fee);
            if (feeAmount > 0) {
                _transferFrom(_trade.tokenIn, from, FEE_CLAIMER, feeAmount);
                amountIn -= feeAmount;
            }
        }

        // Move funds to router if needed
        if (from != address(this)) {
            IERC20(_trade.tokenIn).safeTransferFrom(from, address(this), amountIn);
        }

        // FIRST LEG: Input -> Intermediate (Split across adapters)
        uint256 midBalBefore = IERC20(_trade.intermediate).balanceOf(address(this));

        for (uint256 i = 0; i < _trade.inputHops.length; i++) {
            uint256 hopAmount = (amountIn * _trade.inputHops[i].proportion) / FEE_DENOMINATOR;
            if (hopAmount == 0) continue;

            // Query adapter for expected output
            uint256 expectedOut = IAdapter(_trade.inputHops[i].adapter).query(
                hopAmount,
                _trade.tokenIn,
                _trade.intermediate
            );

            // Transfer tokens to adapter
            IERC20(_trade.tokenIn).safeTransfer(_trade.inputHops[i].adapter, hopAmount);

            // Execute swap
            IAdapter(_trade.inputHops[i].adapter).swap(
                hopAmount,
                expectedOut,
                _trade.tokenIn,
                _trade.intermediate,
                address(this)
            );
        }

        uint256 midBalAfter = IERC20(_trade.intermediate).balanceOf(address(this));
        uint256 collectedIntermediate = midBalAfter - midBalBefore;
        require(collectedIntermediate > 0, "No intermediate tokens");

        // SECOND LEG: Intermediate -> Output (Single adapter)
        uint256 expectedFinalOut = IAdapter(_trade.outputHop.adapter).query(
            collectedIntermediate,
            _trade.intermediate,
            _trade.tokenOut
        );

        // Transfer intermediate tokens to output adapter
        IERC20(_trade.intermediate).safeTransfer(_trade.outputHop.adapter, collectedIntermediate);

        // Measure actual output
        uint256 balBefore = IERC20(_trade.tokenOut).balanceOf(_to);

        IAdapter(_trade.outputHop.adapter).swap(
            collectedIntermediate,
            expectedFinalOut,
            _trade.intermediate,
            _trade.tokenOut,
            _to
        );

        uint256 balAfter = IERC20(_trade.tokenOut).balanceOf(_to);
        uint256 finalAmount = balAfter - balBefore;

        require(finalAmount >= _minAmountOut, "Slippage exceeded");

        emit EmpXswap(_trade.tokenIn, _trade.tokenOut, _trade.amountIn, finalAmount);
        return finalAmount;
    }

    // =============================================================
    // STRATEGY 2: STANDARD SPLIT (Parallel Paths)
    // =============================================================

    /**
     * @notice Executes parallel swap paths
     * @dev Splits input amount across different routing paths
     */
    function executeSplitSwap(
        SplitPath[] calldata _paths,
        uint256 _amountIn,
        uint256 _minAmountOut,
        address _to,
        uint256 _fee
    ) external payable returns (uint256 totalOut) {
        require(_paths.length > 0, "Empty paths");
        
        address tokenIn = _paths[0].path[0];
        address tokenOut = _paths[0].path[_paths[0].path.length - 1];
        address from = msg.sender;

        // Handle native wrapping
        if (tokenIn == WNATIVE && msg.value > 0) {
            require(msg.value == _amountIn, "Value mismatch");
            _wrap(msg.value);
            from = address(this);
        }

        // Apply fee ONCE before splitting
        uint256 amountAfterFee = _amountIn;
        if (_fee > 0) {
            uint256 feeAmount = _amountIn - _applyFee(_amountIn, _fee);
            if (feeAmount > 0) {
                _transferFrom(tokenIn, from, FEE_CLAIMER, feeAmount);
                amountAfterFee = _amountIn - feeAmount;
            }
        }

        // Move funds to router if needed
        if (from != address(this)) {
            IERC20(tokenIn).safeTransferFrom(from, address(this), amountAfterFee);
        }

        // Execute each path
        for (uint256 i = 0; i < _paths.length; i++) {
            uint256 pathAmount = (amountAfterFee * _paths[i].proportion) / FEE_DENOMINATOR;
            if (pathAmount == 0) continue;

            // Build amounts array by querying each adapter
            uint256[] memory amounts = new uint256[](_paths[i].path.length);
            amounts[0] = pathAmount;

            for (uint256 j = 0; j < _paths[i].adapters.length; j++) {
                amounts[j + 1] = IAdapter(_paths[i].adapters[j]).query(
                    amounts[j],
                    _paths[i].path[j],
                    _paths[i].path[j + 1]
                );
            }

            // Transfer initial tokens to first adapter
            IERC20(tokenIn).safeTransfer(_paths[i].adapters[0], amounts[0]);

            // Execute swaps through each adapter
            for (uint256 j = 0; j < _paths[i].adapters.length; j++) {
                address target = (j < _paths[i].adapters.length - 1) 
                    ? _paths[i].adapters[j + 1]  // Next adapter
                    : _to;                        // Final destination

                IAdapter(_paths[i].adapters[j]).swap(
                    amounts[j],
                    amounts[j + 1],
                    _paths[i].path[j],
                    _paths[i].path[j + 1],
                    target
                );
            }

            totalOut += amounts[amounts.length - 1];
        }

        require(totalOut >= _minAmountOut, "Slippage exceeded");
        emit EmpXswap(tokenIn, tokenOut, _amountIn, totalOut);
    }

    // =============================================================
    // V1 COMPATIBILITY (swapNoSplit functions)
    // =============================================================

    function _swapNoSplit(
        Trade calldata _trade,
        address _from,
        address _to,
        uint256 _fee
    ) internal returns (uint256) {
        uint256[] memory amounts = new uint256[](_trade.path.length);
        
        // Apply fee
        if (_fee > 0 || MIN_FEE > 0) {
            amounts[0] = _applyFee(_trade.amountIn, _fee);
            _transferFrom(_trade.path[0], _from, FEE_CLAIMER, _trade.amountIn - amounts[0]);
        } else {
            amounts[0] = _trade.amountIn;
        }

        // Transfer to first adapter
        _transferFrom(_trade.path[0], _from, _trade.adapters[0], amounts[0]);

        // Query all adapters to get expected amounts
        for (uint256 i = 0; i < _trade.adapters.length; i++) {
            amounts[i + 1] = IAdapter(_trade.adapters[i]).query(
                amounts[i],
                _trade.path[i],
                _trade.path[i + 1]
            );
        }

        require(amounts[amounts.length - 1] >= _trade.amountOut, "Insufficient output");

        // Execute swaps
        for (uint256 i = 0; i < _trade.adapters.length; i++) {
            address targetAddress = (i < _trade.adapters.length - 1) 
                ? _trade.adapters[i + 1] 
                : _to;

            IAdapter(_trade.adapters[i]).swap(
                amounts[i],
                amounts[i + 1],
                _trade.path[i],
                _trade.path[i + 1],
                targetAddress
            );
        }

        emit EmpXswap(_trade.path[0], _trade.path[_trade.path.length - 1], _trade.amountIn, amounts[amounts.length - 1]);
        return amounts[amounts.length - 1];
    }

    function swapNoSplit(Trade calldata t, address to, uint256 f) public override {
        _swapNoSplit(t, msg.sender, to, f);
    }

    function swapNoSplitFromPLS(Trade calldata t, address to, uint256 f) external payable override {
        require(t.path[0] == WNATIVE, "Not WPLS");
        _wrap(t.amountIn);
        _swapNoSplit(t, address(this), to, f);
    }

    function swapNoSplitToPLS(Trade calldata t, address to, uint256 f) public override {
        require(t.path[t.path.length - 1] == WNATIVE, "Not WPLS");
        uint256 ret = _swapNoSplit(t, msg.sender, address(this), f);
        _unwrap(ret);
        _returnTokensTo(NATIVE, ret, to);
    }

    function swapNoSplitWithPermit(
        Trade calldata t,
        address to,
        uint256 f,
        uint256 d,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        IERC20(t.path[0]).permit(msg.sender, address(this), t.amountIn, d, v, r, s);
        swapNoSplit(t, to, f);
    }

    function swapNoSplitToPLSWithPermit(
        Trade calldata t,
        address to,
        uint256 f,
        uint256 d,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        IERC20(t.path[0]).permit(msg.sender, address(this), t.amountIn, d, v, r, s);
        swapNoSplitToPLS(t, to, f);
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function trustedTokensCount() external view override returns (uint256) {
        return TRUSTED_TOKENS.length;
    }

    function adaptersCount() external view override returns (uint256) {
        return ADAPTERS.length;
    }

    function queryAdapter(uint256 a, address b, address c, uint8 d) external view override returns (uint256) {
        return IAdapter(ADAPTERS[d]).query(a, b, c);
    }

    function queryNoSplit(uint256 _amountIn, address _tokenIn, address _tokenOut) 
        public view override returns (Query memory) 
    {
        Query memory bestQuery;
        for (uint8 i; i < ADAPTERS.length; i++) {
            try IAdapter(ADAPTERS[i]).query(_amountIn, _tokenIn, _tokenOut) returns (uint256 val) {
                if (val > bestQuery.amountOut) {
                    bestQuery = Query(ADAPTERS[i], _tokenIn, _tokenOut, val);
                }
            } catch {}
        }
        return bestQuery;
    }

    function queryNoSplit(uint256 a, address b, address c, uint8[] calldata d) 
        public view override returns (Query memory) 
    {
        Query memory bestQuery;
        for (uint8 i; i < d.length; i++) {
            try IAdapter(ADAPTERS[d[i]]).query(a, b, c) returns (uint256 val) {
                if (val > bestQuery.amountOut) {
                    bestQuery = Query(ADAPTERS[d[i]], b, c, val);
                }
            } catch {}
        }
        return bestQuery;
    }

    function findBestPath(uint256 a, address b, address c, uint256 d) 
        public view override returns (FormattedOffer memory) 
    {
        Offer memory o = OfferUtils.newOffer(a, b);
        return o.format();
    }

    function findBestPathWithGas(uint256 a, address b, address c, uint256 d, uint256 e) 
        external view override returns (FormattedOffer memory) 
    {
        return findBestPath(a, b, c, d);
    }

    function swap(bytes calldata, address) external payable returns (uint256) {
        revert("Use executeConvergeSwap or executeSplitSwap");
    }
}