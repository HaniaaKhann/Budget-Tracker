const chatbotPanel = document.getElementById("chatbot-panel");
const closeChatBtn = document.getElementById("close-chat");

const openChatBtn = document.getElementById("chatbot-btn");

if (openChatBtn) {
    openChatBtn.addEventListener("click", function(e){
        e.preventDefault();
        chatbotPanel.classList.add("open");
    });
}

if (closeChatBtn) {
    closeChatBtn.addEventListener("click", () => {
        chatbotPanel.classList.remove("open");
    });
}

const chatMessages = document.getElementById("chat-messages");
const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

function addMessage(message, sender){
    const div = document.createElement("div");
    div.classList.add(sender + "-message");
    div.innerHTML = message;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}
if (input){
    input.addEventListener("keypress", function(e){
    if(e.key ==="Enter"){
        e.preventDefault();
        sendMessage();
    }
    });
}

async function sendMessage(){
    const text= input.value.trim();
    if(text==="") return;
    addMessage(text, "user");
    input.value="";

    try{
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({
                message: text
            })
        });
        const data = await response.json();
        addMessage(data.reply, "bot");
    } catch (err){
        addMessage("Something went wrong", "bot");
        console.error(err);
    }
    
}

