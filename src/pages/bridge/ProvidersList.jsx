import { useState, useEffect, useRef } from "react";
import { Copy, Check, Bitcoin } from "lucide-react";

const tabs = ["Ongoing", "Past", "Market"];

const data = Array(6).fill({
  name: "WBTC",
  address: "0x05...2b9cui",
  price: "$112,397.43",
  change: "-0.65%",
  logo: <Bitcoin className="text-[#FF9900]" size={24} />,
});

export default function App() {
  const [activeTab, setActiveTab] = useState("Ongoing");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [animateLine, setAnimateLine] = useState(false);

  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setAnimateLine(true);
        } else {
          setAnimateLine(false);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);
  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div
      ref={sectionRef}
      className="text-white flex justify-center items-center md:max-w-[1140px] w-full mx-auto sctable"
    >
      <div className="lg:px-20 md:px-10 px-4 w-full">
        {/* Tabs */}
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 md:text-base text-sm font-extrabold border border-[#FF9900] rounded-t-[10px] font-orbitron transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#FF9900] text-black md:w-[220px] h-[70px]"
                  : "text-orange-400 hover:bg-[#FF9900]/20 md:w-[160px] h-[70px]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="clip-bg1 w-full rounded-tr-2xl rounded-b-2xl lg:py-16 lg:px-20 md:px-10 px-4 md:py-12 py-10">
          <div className="space-y-3">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="flex md:justify-between justify-center items-center md:flex-nowrap md:gap-2 gap-4 flex-wrap bg-black border border-[#FF9900] rounded-[10px] lg:px-10 lg:py-6 md:px-6 py-4 px-3 hover:bg-[#FF9900]/10 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                    {item.logo}
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="font-semibold">{item.name}</div>
                    <div className="flex items-center space-x-1 py-1 text-[#D9D9D9] text-sm bg-[#1b1a17] px-3 md:max-w-[200px] w-full gap-2 justify-between rounded-full">
                      <span>{item.address}</span>
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy
                          className="w-4 h-4 cursor-pointer hover:text-orange-400"
                          onClick={() => handleCopy(item.address, idx)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-[#D9D9D9] text-sm">
                      {item.price}
                    </div>
                    <div className="text-[#FF4D4F] text-sm p-[2px] bg-[#FF7875]/15 rounded-full">
                      {item.change}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-2 justify-center">
                    <svg
                      width={135}
                      height={12}
                      viewBox="0 0 135 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0.0488281 3.93336C1.91507 4.05432 3.78227 4.17528 5.64851 4.54584C7.5157 4.9164 9.38194 6.04536 11.2491 6.15576C13.1154 6.26616 14.9826 6.21144 16.8488 6.32184C18.7151 6.4332 20.5823 6.60792 22.4485 6.87576C24.3157 7.14264 26.1819 7.926 28.0491 7.926C29.9154 7.926 31.7826 6.98616 33.6488 6.76536C35.515 6.5436 37.3822 6.4332 39.2485 6.4332C41.1157 6.4332 42.9819 6.4332 44.8491 6.4332C46.7154 6.4332 48.5826 6.51576 50.4488 6.5436C52.315 6.57144 54.1822 6.56184 56.0485 6.59928C57.9157 6.63576 59.7819 9.96503 61.6491 9.96503C63.5154 9.96503 65.3826 9.06552 67.2488 8.8092C69.115 8.55192 70.9822 8.42328 72.8485 8.42328C74.7157 8.42328 76.5819 8.42328 78.4491 8.42328C80.3153 8.42328 82.1825 2.5404 84.0488 2.42808C85.915 2.31672 87.7822 2.29752 89.6485 2.26104C91.5157 2.2236 93.3819 2.24184 95.2491 2.2044C97.1153 2.16792 98.9825 1.31064 100.849 1.086C102.715 0.86232 104.582 0.75 106.448 0.75C108.316 0.75 110.182 0.76824 112.049 0.80568C113.915 0.84312 115.783 2.15832 117.649 2.59608C119.515 3.03384 121.382 2.87448 123.248 3.43224C125.116 3.99 126.982 8.69976 128.849 9.36023C130.715 10.0198 132.583 10.1849 134.449 10.35"
                        stroke="url(#paint0_linear_1853_247)"
                        strokeWidth="1.5"
                        strokeDasharray="150"
                        style={{
                          strokeDashoffset: animateLine ? 0 : 150,
                          transition: "stroke-dashoffset 1.8s ease-out",
                        }}
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear_1853_247"
                          x1="69.1688"
                          y1="-3.07149"
                          x2="69.1711"
                          y2="4.59005"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#FF4B00" />
                          <stop offset={1} stopColor="#FF9F2E" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
