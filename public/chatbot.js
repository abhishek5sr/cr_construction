// public/chatbot.js - Frontend Chatbot for C&R Building Solutions
class Chatbot {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createChatWidget();
        this.setupEventListeners();
    }

    createChatWidget() {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'cr-chatbot';
        chatContainer.innerHTML = `
            <div class="chatbot-toggle" id="chatbotToggle">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="chatbot-window hidden" id="chatbotWindow">
                <div class="chatbot-header">
                    <h3>C&R AI Assistant</h3>
                    <button id="closeChatbot" class="close-btn">×</button>
                </div>
                <div class="chatbot-messages" id="chatbotMessages">
                    <div class="bot-message">
                        <p>👋 Hello! I'm your C&R AI assistant! I can help you with:</p>
                        <ul>
                            <li>🏗️ Building materials & pricing</li>
                            <li>🏠 Construction services</li>
                            <li>🚚 Delivery information</li>
                            <li>💰 Quotes & estimates</li>
                        </ul>
                        <p>What would you like to know today?</p>
                    </div>
                </div>
                <div class="chatbot-input">
                    <input type="text" id="chatbotInput" placeholder="Ask about construction...">
                    <button id="sendMessage">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
                <div class="suggested-questions">
                    <div class="suggestion" onclick="chatbot.handleSuggestion('What materials do you offer?')">Materials</div>
                    <div class="suggestion" onclick="chatbot.handleSuggestion('Cement and brick prices')">Pricing</div>
                    <div class="suggestion" onclick="chatbot.handleSuggestion('Construction services')">Services</div>
                    <div class="suggestion" onclick="chatbot.handleSuggestion('Contact information')">Contact</div>
                </div>
            </div>
        `;
        document.body.appendChild(chatContainer);
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style>
                #cr-chatbot {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                }
                .chatbot-toggle {
                    width: 60px;
                    height: 60px;
                    background: #EFB400;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(239, 180, 0, 0.3);
                    transition: all 0.3s ease;
                }
                .chatbot-toggle:hover {
                    transform: scale(1.1);
                    background: #D4A017;
                }
                .chatbot-toggle i {
                    color: white;
                    font-size: 24px;
                }
                .chatbot-window {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    width: 350px;
                    height: 450px;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    border: 2px solid #EFB400;
                }
                .chatbot-window.hidden {
                    display: none;
                }
                .chatbot-header {
                    background: #EFB400;
                    color: white;
                    padding: 15px;
                    border-radius: 13px 13px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .chatbot-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    width: 25px;
                    height: 25px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .close-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .chatbot-messages {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: #f8f9fa;
                }
                .user-message, .bot-message {
                    max-width: 85%;
                    padding: 10px 15px;
                    border-radius: 18px;
                    margin: 5px 0;
                }
                .user-message {
                    background: #EFB400;
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 5px;
                }
                .bot-message {
                    background: white;
                    color: #333;
                    align-self: flex-start;
                    border-bottom-left-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .bot-message ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .bot-message li {
                    margin: 5px 0;
                    font-size: 0.9rem;
                }
                .chatbot-input {
                    padding: 15px;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 10px;
                    background: white;
                }
                #chatbotInput {
                    flex: 1;
                    padding: 10px 15px;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    outline: none;
                    font-size: 0.9rem;
                }
                #chatbotInput:focus {
                    border-color: #EFB400;
                }
                #sendMessage {
                    background: #EFB400;
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s ease;
                }
                #sendMessage:hover {
                    background: #D4A017;
                }
                .suggested-questions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 10px 15px;
                    border-top: 1px solid #eee;
                    background: white;
                    border-radius: 0 0 13px 13px;
                }
                .suggestion {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    padding: 6px 12px;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    color: #495057;
                }
                .suggestion:hover {
                    background: #EFB400;
                    color: white;
                    border-color: #EFB400;
                }
                .typing-indicator {
                    display: flex;
                    gap: 5px;
                    padding: 10px 15px;
                    background: white;
                    border-radius: 18px;
                    align-self: flex-start;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .typing-dot {
                    width: 8px;
                    height: 8px;
                    background: #6c757d;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-5px); }
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        document.getElementById('chatbotToggle').addEventListener('click', () => this.toggleChat());
        document.getElementById('closeChatbot').addEventListener('click', () => this.closeChat());
        document.getElementById('sendMessage').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatbotInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';
        this.showTypingIndicator();

        try {
            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            this.addMessage(response.response, 'bot');
        } catch (error) {
            this.hideTypingIndicator();
            // Fallback to simple responses if API fails
            const fallbackResponse = this.generateFallbackResponse(message);
            this.addMessage(fallbackResponse, 'bot');
        }
    }

    async getAIResponse(message) {
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                userId: 'user_' + Date.now(),
                sessionId: 'session_' + Date.now()
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        return await response.json();
    }

    generateFallbackResponse(message) {
        const msg = message.toLowerCase();
        if (msg.includes('hello') || msg.includes('hi')) return "Hello! Welcome to C&R Building Solutions! 🏗️";
        if (msg.includes('material') || msg.includes('cement') || msg.includes('brick')) return "We offer premium building materials: Cement, Steel, Bricks, Sand, Aggregates. Visit our Shop page for details!";
        if (msg.includes('price') || msg.includes('cost')) return "💰 Cement: ₹300-450/bag | Bricks: ₹8-12/piece | Steel: ₹60-80/kg. Contact us for exact quotes!";
        if (msg.includes('service') || msg.includes('construction')) return "🏠 Our services: Home Construction, Infrastructure Projects, Corporate Solutions. Check our Services page!";
        if (msg.includes('contact')) return "📞 Contact: +91 123 456 7890 | 📧 info@crbuildingsolutions.com | 📍 Delhi, India";
        if (msg.includes('delivery')) return "🚚 Delivery: 2-3 days standard | Free delivery on orders above ₹50,000";
        return "I can help with construction materials, services, pricing, and more. What would you like to know?";
    }

    addMessage(text, sender) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        messageDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbotMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    handleSuggestion(question) {
        const input = document.getElementById('chatbotInput');
        input.value = question;
        this.sendMessage();
    }

    toggleChat() {
        const window = document.getElementById('chatbotWindow');
        this.isOpen = !this.isOpen;
        window.classList.toggle('hidden', !this.isOpen);
        
        if (this.isOpen) {
            document.getElementById('chatbotInput').focus();
        }
    }

    closeChat() {
        const window = document.getElementById('chatbotWindow');
        this.isOpen = false;
        window.classList.add('hidden');
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new Chatbot();
});