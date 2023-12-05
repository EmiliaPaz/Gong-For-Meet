// Meet call url.
const meetUrl = "https://meet.google.com/*";

// Buttons.
let startButton = document.getElementById("startButton");
let stopButton = document.getElementById("stopButton");

// Countdown.
let minutes = document.getElementById("minutes");
let seconds = document.getElementById("seconds");
const countdownInputs = document.querySelectorAll("input");
const countdownError = document.querySelector("#error");

let countdownInterval;

const CountdownState = {
  running: 0,
  notRunning: 1,
};

// Shows an error when countdown input is invalid.
const throwCountdownErr = (mssg, input, invalid = false) => {
  // control display of error
  if (invalid === true) {
    input.classList.add("invalid");
    countdownError.style.visibility = "visible";
    countdownError.innerHTML = `<small>${mssg}</small>`;
  } else {
    input.classList.remove("invalid");
    countdownError.style.visibility = "hidden";
  }
};

// Resets the countdown interval and stored value.
function resetCountdown() {
  clearInterval(countdownInterval);
  chrome.storage.session.clear();
}

// Updates the countdown UI every minute until it hits the `endTime`.
function updateCountdownUI(endTime) {
  // Update countdown every 1s.
  countdownInterval = setInterval(function () {
    // Calculate the remaining time
    const currentTime = new Date();
    let remainingTime = endTime - currentTime;

    // Stop countdown when time runs up. This can also happen when the popup is
    // closed, which is handled at popup initialization.
    if (remainingTime < 0) {
      resetCountdown();
      updateUI(CountdownState.notRunning);

      return;
    }

    let remainingMinutes = Math.floor(
      (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
    );
    let remainingSeconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    minutes.value = minutes < 10 ? "0" + remainingMinutes : remainingMinutes;
    seconds.value = seconds < 10 ? "0" + remainingSeconds : remainingSeconds;
  }, 1000);
}

// Updates the popupo for `states`. `endTime` is only given when the states is
// `notRunning`.
function updateUI(state, endTime) {
  switch (state) {
    case CountdownState.running:
      startButton.style.display = "none";
      stopButton.style.display = "block";
      updateCountdownUI(endTime);
      countdownInputs.forEach((input) => {
        input.disabled = true;
      });
      break;
    case CountdownState.notRunning:
      startButton.style.display = "block";
      stopButton.style.display = "none";
      countdownInputs.forEach((input) => {
        input.disabled = false;
        input.value = 0;
      });
      break;
  }
}

// Sends `message` to meet call, iff the current tab is on one.
async function sendMessageToMeet(countdown) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url.match(meetUrl)) {
    await chrome.tabs.sendMessage(tab.id, { countdown });
  }
}

// Recieve countdown inputs.
countdownInputs.forEach((input) => {
  let isInvalid = false;
  let mssg;

  input.addEventListener("focus", (e) => {
    // Blank input on default values
    if (e.target.value === "0" || e.target.value === "00") {
      e.target.value = "";
    }

    // Show error mssg for invalid inputs when not corrected
    if (e.target.classList.contains("invalid")) {
      isInvalid = true;
      throwCountdownErr(mssg, input, isInvalid);
    } else {
      isInvalid = false;
      throwCountdownErr(mssg, input);
    }
  });

  input.addEventListener("keyup", (e) => {
    let val = e.target.value;

    // Only allow digits.
    input.value = val.replace(/[^0-9]+/g, "");

    // Restrict input characters
    if (e.target.value.length > 2) {
      input.value = e.target.value.substring(0, 2);
    }

    // Max amount of seconds and minutes.
    const max = 60;
    if (+input.value > max) {
      isInvalid = true;
      mssg = `Value can't be more than ${max}`;

      throwCountdownErr(mssg, input, isInvalid);
    } else {
      isInvalid = false;
      throwCountdownErr(mssg, input);
    }
  });
});

// Start countdown when start button is clicked.
startButton.addEventListener("click", async () => {
  const countdownInput = minutes.value * 60000 + seconds.value * 1000;
  if (countdownInput === 0) {
    return;
  }

  // Compute end time.
  let endTime = new Date();
  endTime.setMilliseconds(endTime.getMilliseconds() + countdownInput);

  // Update the countdown, since we support it on every site.
  updateUI(CountdownState.running, endTime);

  // Store end time so we know about it if we reopen the popup.
  chrome.storage.session.set({ endTime: endTime.toISOString() });

  // Tell script to execute in `countdownInput` iff we are on a meet call.
  await sendMessageToMeet({ start: countdownInput });
});

// Stop countdown when stop button is clicked.
stopButton.addEventListener("click", async () => {
  resetCountdown();
  updateUI(CountdownState.notRunning);

  // Tell script to stop execution iff we are on a meet call.
  await sendMessageToMeet({ clear: true });
});

// Retrieve stored end time and update value according to state.
chrome.storage.session.get(["endTime"], (result) => {
  const currentTime = new Date();
  const endTime = result && result.endTime ? new Date(result.endTime) : null;

  if (endTime === null) {
    updateUI(CountdownState.notRunning);
  } else if (endTime < currentTime) {
    resetCountdown();
    updateUI(CountdownState.notRunning);
  } else {
    updateUI(CountdownState.running, endTime);
  }
});
