// DOM elements.
let startButton = document.getElementById("startButton");
let stopButton = document.getElementById("stopButton");
let countdown = document.getElementById("countdown");

let countdownInterval;

const CountdownState = {
  running: 0,
  notRunning: 1,
};

function resetCountdown() {
  clearInterval(countdownInterval);
  chrome.storage.session.clear();
}

function updateCountdownUI(endTime) {
  // Update countdown every 1s.
  countdownInterval = setInterval(function () {
    // Calculate the remaining time
    var currentTime = new Date();
    let remainingTime = endTime - currentTime;

    // Stop countdown when time runs up. This can also happen when the popup is
    // closed, which is handled at popup initialization.
    if (remainingTime < 0) {
      resetCountdown();
      updateUI(CountdownState.notRunning);

      return;
    }

    let minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    // Add leading zero if needed.
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    // Display the countdown
    countdown.innerHTML = minutes + ":" + seconds;
  }, 1000);
}

function updateUI(state, endTime) {
  switch (state) {
    case CountdownState.running:
      startButton.style.display = "none";
      stopButton.style.display = "block";
      countdown.innerHTML = updateCountdownUI(endTime);
      break;
    case CountdownState.notRunning:
      startButton.style.display = "block";
      stopButton.style.display = "none";
      countdown.innerHTML = "";
      break;
  }
}

startButton.addEventListener("click", async () => {
  // TODO: Add textbox so user can select countdown time.
  let countdownTime = 1; // in minutes

  // Compute endtime.
  let endTime = new Date();
  endTime.setMinutes(endTime.getMinutes() + countdownTime);

  updateUI(CountdownState.running, endTime);

  // Store end time so we know about it if we reopen the popup.
  chrome.storage.session.set({ endTime: endTime.toISOString() });

  // Tell script to execute in `countdownTime`.
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.sendMessage(tab[0]?.id, {
    start: countdownTime * 60 * 1000,
  });
});

stopButton.addEventListener("click", async () => {
  resetCountdown();
  updateUI(CountdownState.notRunning);

  // Tell script to stop execution.
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.sendMessage(tab[0]?.id, {
    clear: true,
  });
});

chrome.storage.session.get(["endTime"], function (result) {
  const currentTime = new Date();
  const endTime = result && result.endTime ? new Date(result.endTime) : null;

  if (endTime === null) {
    console.log("endtime null");
    updateUI(CountdownState.notRunning);
  } else if (endTime < currentTime) {
    console.log("endtime smaller than current time");
    resetCountdown();
    updateUI(CountdownState.notRunning);
  } else {
    console.log("running");
    updateUI(CountdownState.running, endTime);
  }
});
