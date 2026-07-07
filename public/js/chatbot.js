const chatbotPanel = document.getElementById("chatbot-panel");
const closeChatBtn = document.getElementById("close-chat");
const openChatBtn = document.getElementById("chatbot-btn");
const chatMessages = document.getElementById("chat-messages");
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function applyBold(text) {
    return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function formatBotReply(text) {
    if (!text) return "";

    const lines = text.trim().split("\n");
    let html = "";
    let inList = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            if (!inList) {
                html += "<ul>";
                inList = true;
            }
            html += "<li>" + applyBold(escapeHtml(trimmed.slice(2))) + "</li>";
            continue;
        }

        if (inList) {
            html += "</ul>";
            inList = false;
        }

        if (trimmed === "") {
            continue;
        }

        html += "<p>" + applyBold(escapeHtml(trimmed)) + "</p>";
    }

    if (inList) {
        html += "</ul>";
    }

    return html;
}

function addMessage(message, sender) {
    const div = document.createElement("div");
    div.classList.add(sender + "-message");

    if (sender === "bot") {
        div.innerHTML = formatBotReply(message);
    } else {
        div.textContent = message;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

if (openChatBtn && chatbotPanel) {
    openChatBtn.addEventListener("click", function (e) {
        e.preventDefault();
        chatbotPanel.classList.add("open");
        input.focus();
    });
}

if (closeChatBtn && chatbotPanel) {
    closeChatBtn.addEventListener("click", () => {
        chatbotPanel.classList.remove("open");
    });
}

async function sendMessage() {
    if (!input || !sendBtn) return;

    const text = input.value.trim();
    if (text === "") return;

    addMessage(text, "user");
    input.value = "";
    sendBtn.disabled = true;

    const loadingMessage = addMessage("Thinking...", "bot");
    loadingMessage.classList.add("bot-loading");

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        loadingMessage.remove();
        addMessage(data.reply || "Sorry, I could not answer that.", "bot");
    } catch (err) {
        loadingMessage.remove();
        addMessage("Something went wrong. Please try again.", "bot");
        console.error(err);
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

if (input) {
    input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
}
