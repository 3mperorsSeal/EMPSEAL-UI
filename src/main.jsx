import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import store from "./redux/store/store.jsx";
import { Provider } from "react-redux";
import "react-toastify/dist/ReactToastify.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
