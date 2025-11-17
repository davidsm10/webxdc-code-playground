const input = document.getElementById("input");
const form = document.getElementById("form");
const output = document.getElementById("output");

function sendMsg(e) {
  e.preventDefault();
  const msg = input.value;
  const info = `Someone sent "${msg}"`;
  window.webxdc.sendUpdate({ payload: msg, info: info }, "");
  input.value = "";
}
form.onsubmit = sendMsg;


function receiveUpdate(update) {
  output.innerText += update.payload + "\n";
}
window.webxdc.setUpdateListener(receiveUpdate, 0);