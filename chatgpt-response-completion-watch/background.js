chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'cgpt-response-complete') return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.svg',
    title: 'ChatGPT response complete',
    message: message.title || 'A response finished generating.',
    priority: 1
  });
});
