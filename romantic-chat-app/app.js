// Supabase Configuration
const SUPABASE_URL = 'https://kixynpfxvqxtpsuwmbkh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHlucGZ4dnF4dHBzdXdtYmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2MDY4MjUsImV4cCI6MjA1NTE4MjgyNX0.XDqQUjKfqgoEiJeuuaJG4xi8AQA4smjKlt7uS4aYUU0'
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const chatContainer = document.getElementById('chatContainer');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const gifBtn = document.getElementById('gifBtn');
const memoriesBtn = document.getElementById('memoriesBtn');
const cringeMemoriesContainer = document.getElementById('cringeMemoriesContainer');
const closeMemoriesBtn = document.getElementById('closeMemoriesBtn');
const memoriesList = document.getElementById('memoriesList');

// State
let currentUser = null;
let messages = [];
let cringeMemories = [];

// Constants for the AI text rewriter
const ANGRY_PATTERNS = [
    'hate', 'annoying', 'stupid', 'ignore', 'whatever', 'ugh', 'go away',
    'leave me alone', 'don\'t talk to me', 'shut up', 'stop talking to me',
    'idiot', 'dumb', 'useless', 'annoying', 'myre', 'thendi', 'patti', 'umb'
];

const FLIRTY_RESPONSES = [
    "You're dangerously attractive, and it's distracting me 😏",
    "Your presence makes my heart skip a beat 💓",
    "I can't stay mad when you're this cute 🥰",
    "You're living rent-free in my mind 24/7 ✨",
    "Why are you so irresistible? It's not fair! 💝",
    "Your smile could light up the darkest room 🌟",
    "I'm getting butterflies just thinking about you 🦋",
    "You make my heart go boom boom 💘",
    "Every second with you feels like a romantic movie 🎬",
    "You're the main character in my love story 📖"
];

// Local Storage Functions
const saveToLocalStorage = () => {
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('cringeMemories', JSON.stringify(cringeMemories));
};

const loadFromLocalStorage = () => {
    const savedMessages = localStorage.getItem('messages');
    const savedMemories = localStorage.getItem('cringeMemories');
    
    if (savedMessages) messages = JSON.parse(savedMessages);
    if (savedMemories) cringeMemories = JSON.parse(savedMemories);
};

// AI Text Rewriter
const isAngryMessage = (text) => {
    return ANGRY_PATTERNS.some(pattern => 
        text.toLowerCase().includes(pattern.toLowerCase())
    );
};

const getFlirtyResponse = () => {
    const randomIndex = Math.floor(Math.random() * FLIRTY_RESPONSES.length);
    return FLIRTY_RESPONSES[randomIndex];
};

// Message Functions
const createMessageElement = (message) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', message.sender === currentUser ? 'sent' : 'received');
    messageDiv.textContent = message.text;
    return messageDiv;
};

const addMessage = async (text, sender) => {
    if (isAngryMessage(text)) {
        text = getFlirtyResponse();
        // Save original message as a cringe memory
        const { data, error } = await supabase
            .from('cringe_memories')
            .insert([{
                original: text,
                transformed: text,
                timestamp: new Date().toISOString()
            }]);
        
        if (error) console.error('Error saving cringe memory:', error);
    }

    const message = {
        text,
        sender,
        timestamp: new Date().toISOString()
    };

    // Insert message into Supabase
    const { data, error } = await supabase
        .from('messages')
        .insert([message]);

    if (error) console.error('Error sending message:', error);
};

// Subscribe to new messages
const subscribeToMessages = () => {
    supabase
        .channel('public:messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                const message = payload.new;
                messagesContainer.appendChild(createMessageElement(message));
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        )
        .subscribe();
};

// Subscribe to new cringe memories
const subscribeToCringeMemories = () => {
    supabase
        .channel('public:cringe_memories')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'cringe_memories' },
            (payload) => {
                const memory = payload.new;
                cringeMemories.push(memory);
            }
        )
        .subscribe();
};

// Load initial messages and memories
const loadInitialData = async () => {
    // Load messages
    const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true });
    
    if (messagesError) {
        console.error('Error loading messages:', messagesError);
    } else {
        messages.forEach(message => {
            messagesContainer.appendChild(createMessageElement(message));
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Load cringe memories
    const { data: memories, error: memoriesError } = await supabase
        .from('cringe_memories')
        .select('*')
        .order('timestamp', { ascending: false });
    
    if (memoriesError) {
        console.error('Error loading memories:', memoriesError);
    } else {
        cringeMemories = memories;
    }
};

loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        try {
            // Check active users from Supabase
            const { data: activeUsers, error: fetchError } = await supabase
                .from('active_users')
                .select('username');

            if (fetchError) throw fetchError;

            if (activeUsers.some(user => user.username === username)) {
                alert('This username is already taken! Please choose another one.');
                return;
            }

            if (activeUsers.length >= 2) {
                alert('Sorry, chat room is full! Only two users can chat at a time.');
                return;
            }

            // Add user to active users
            const { error: insertError } = await supabase
                .from('active_users')
                .insert([{
                    username: username,
                    last_seen: new Date().toISOString()
                }]);

            if (insertError) throw insertError;

            currentUser = username;
            loginContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');

            // Initialize real-time subscriptions
            subscribeToMessages();
            subscribeToCringeMemories();
            loadInitialData();

            // Set up presence channel
            const presenceChannel = supabase.channel('online-users');
            
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const presenceState = presenceChannel.presenceState();
                    console.log('Online users:', presenceState);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await presenceChannel.track({ user: username });
                    }
                });

            // Clean up user data when they leave
            window.addEventListener('beforeunload', async () => {
                await supabase
                    .from('active_users')
                    .delete()
                    .eq('username', username);
                
                if (presenceChannel) {
                    await presenceChannel.untrack();
                    await presenceChannel.unsubscribe();
                }
            });

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
});

logoutBtn.addEventListener('click', async () => {
    if (currentUser) {
        try {
            await supabase
                .from('active_users')
                .delete()
                .eq('username', currentUser);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }
    
    currentUser = null;
    messages = [];
    messagesContainer.innerHTML = '';
    chatContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
});

sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text) {
        addMessage(text, currentUser);
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

gifBtn.addEventListener('click', async () => {
    // For demo purposes, we'll just add a static GIF message
    addMessage('🎀 *sends a cute gif* 🎀', currentUser);
});

memoriesBtn.addEventListener('click', () => {
    memoriesList.innerHTML = '';
    cringeMemories.forEach(memory => {
        const memoryDiv = document.createElement('div');
        memoryDiv.classList.add('memory-item');
        memoryDiv.innerHTML = `
            <p><strong>Original:</strong> ${memory.original}</p>
            <p><strong>Transformed:</strong> ${memory.transformed}</p>
            <small>${new Date(memory.timestamp).toLocaleString()}</small>
        `;
        memoriesList.appendChild(memoryDiv);
    });
    cringeMemoriesContainer.classList.remove('hidden');
});

closeMemoriesBtn.addEventListener('click', () => {
    cringeMemoriesContainer.classList.add('hidden');
});
