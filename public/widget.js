(function () {
    // 1. Determine the base URL from the script tag itself
    var scriptParams = new URL(document.currentScript.src);
    var BASE_URL = scriptParams.origin; // e.g., https://your-app.vercel.app

    // 2. Create Styles
    var style = document.createElement('style');
    style.innerHTML = `
        #qg-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #qg-launcher {
            width: 60px;
            height: 60px;
            background: #000;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #qg-launcher:hover {
            transform: scale(1.1);
        }
        #qg-launcher svg {
            width: 30px;
            height: 30px;
            fill: white;
        }
        #qg-iframe-container {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 380px;
            height: 600px;
            max-height: 80vh;
            background: white;
            border-radius: 16px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 9998;
        }
        #qg-iframe-container.open {
            opacity: 1;
            pointer-events: all;
            transform: translateY(0) scale(1);
        }
        #qg-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        @media (max-width: 480px) {
            #qg-iframe-container {
                width: 90%;
                right: 5%;
                bottom: 90px;
            }
        }
    `;
    document.head.appendChild(style);

    // 3. Create DOM Elements
    var container = document.createElement('div');
    container.id = 'qg-widget-container';

    // Launcher Button (Chat Bubble Icon)
    var launcher = document.createElement('div');
    launcher.id = 'qg-launcher';
    launcher.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
    `;

    // Iframe Container
    var iframeContainer = document.createElement('div');
    iframeContainer.id = 'qg-iframe-container';

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.id = 'qg-iframe';
    iframe.src = BASE_URL + '/embed/chat'; // Dynamic Source

    iframeContainer.appendChild(iframe);

    // Append to Body
    container.appendChild(launcher);
    document.body.appendChild(iframeContainer); // Append separately to manage z-indexing easier if needed, or keep in container
    document.body.appendChild(container);

    // 4. Logic
    var isOpen = false;
    launcher.onclick = function () {
        isOpen = !isOpen;
        if (isOpen) {
            iframeContainer.classList.add('open');
            launcher.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            `; // Close Icon
        } else {
            iframeContainer.classList.remove('open');
            launcher.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
            `; // Chat Icon
        }
    };

})();
