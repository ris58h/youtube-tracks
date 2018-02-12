var s = document.createElement('script');
s.src = chrome.extension.getURL('page.js');
(document.head || document.documentElement).appendChild(s);
