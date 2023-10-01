import { useContext } from "react";
import SettingsContext from "./Settings";

export default () => {
  const context = useContext(SettingsContext);

  return context;
};