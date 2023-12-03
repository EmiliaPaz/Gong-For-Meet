function getReactionDOM() {
  const reactionBanner =
    document.querySelector('[aria-label="Reactions"]') ?? null;

  return reactionBanner
    ? {
        heart: reactionBanner.querySelector('img[src*="1f496"]'),
        thumbsup: reactionBanner.querySelector('img[src*="1f44d"]'),
        tada: reactionBanner.querySelector('img[src*="1f389"]'),
        clap: reactionBanner.querySelector('img[src*="1f44f"]'),
        joy: reactionBanner.querySelector('img[src*="1f602"]'),
        openMouth: reactionBanner.querySelector('img[src*="1f62e"]'),
        cry: reactionBanner.querySelector('img[src*="1f622"]'),
        thinking: reactionBanner.querySelector('img[src*="1f914"]'),
        thumbsdown: reactionBanner.querySelector('img[src*="1f44e"]'),
      }
    : null;
}

function sendReaction() {
  const reactions = getReactionDOM();
  if (reactions === null) {
    return;
  }

  reactions.heart.click();
}

let reactionTimeout;
chrome.runtime.onMessage.addListener((message) => {
  if (message.start) {
    setTimeout(sendReaction, message.start);
  }
  if (message.clear) {
    clearTimeout(reactionTimeout);
  }
});
