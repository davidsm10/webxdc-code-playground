const device = document.getElementById("device");
const input = document.getElementById("input");
const form = document.getElementById("form");
const output = document.getElementById("output");

// https://webxdc.org/docs/spec/selfAddr_and_selfName.html
device.innerText = "This is " + window.webxdc.selfName;

function sendMsg(e) {
  e.preventDefault();
  const msg = window.webxdc.selfName + ": " + input.value;
  // https://webxdc.org/docs/spec/sendUpdate.html#sendupdate
  window.webxdc.sendUpdate({ payload: msg, info: msg }, "");
  input.value = "";
}
form.onsubmit = sendMsg;

function receiveUpdate(update) {
  output.innerText += update.payload + "\n";
}
// https://webxdc.org/docs/spec/setUpdateListener.html
window.webxdc.setUpdateListener(receiveUpdate, 0);
