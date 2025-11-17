const input = document.getElementById("input");
const send = document.getElementById("send");
const output = document.getElementById("output");

function sendMsg(e) {
  e.preventDefault();
  const msg = input.value;
  if (!msg.trim()) return;
  const info = `Someone sent "${msg}"`;
  window.webxdc.sendUpdate({ payload: msg, info: info }, "");
  input.value = "";
}
send.onclick = sendMsg;


function receiveUpdate(update) {
  output.innerText += update.payload + "\n";
}
window.webxdc.setUpdateListener(receiveUpdate, 0);