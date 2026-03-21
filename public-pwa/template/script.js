const button = document.getElementById("clickMeBtn");
const output = document.getElementById("output");

button.addEventListener("click", () => {
  output.textContent = "Button clicked!";
});
