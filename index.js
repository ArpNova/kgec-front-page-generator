import { getItem,KEYS } from "./lib/storage.js";
import { renderNavbar } from "./lib/navbar.js";
renderNavbar("");

function init() {
  const profile = getItem(KEYS.PROFILE);
  console.log("Landing page loaded. Profile exists:", Boolean(profile));
}

init();