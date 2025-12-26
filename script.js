// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwK58We6awwwCMuHThYZA8iXXji5MuVeI",
  authDomain: "mathkids-de4a0.firebaseapp.com",
  projectId: "mathkids-de4a0",
  storageBucket: "mathkids-de4a0.firebasestorage.app",
  messagingSenderId: "463966125316",
  appId: "1:463966125316:web:6656af016d1c5a44da6451"
};

// Inicializar Firebase
let app, db, auth, analytics;
let currentUser = null;
let userData = null;
let adminExists = false;

// Inicializar Firebase
try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    analytics = firebase.analytics();
    console.log("Firebase inicializado com sucesso!");
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    showNotification("Erro de conexão", "Não foi possível conectar ao servidor.", "error");
}

// Estado da aplicação
let currentSection = 'dashboard';
let currentAdminTab = 'users';
let currentOperation = null;
let currentGame = null;
let progressData = {
    exercisesCompleted: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    practiceTime: 0,
    level: 1,
    addition: { correct: 0, total: 0 },
    subtraction: { correct: 0, total: 0 },
    multiplication: { correct: 0, total: 0 },
    division: { correct: 0, total: 0 }
};

// Elementos DOM
const loadingOverlay = document.getElementById('loadingOverlay');
const authScreen = document.getElementById('authScreen');
const mainApp = document.getElementById('mainApp');

// Elementos de autenticação
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const recoverForm = document.getElementById('recoverForm');
const loginBtn = document.getElementById('loginBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const registerBtn = document.getElementById('registerBtn');
const recoverBtn = document.getElementById('recoverBtn');
const userTypeSelect = document.getElementById('userType');
const adminOption = document.getElementById('adminOption');
const adminHint = document.getElementById('adminHint');

// Elementos principais
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebarClose');
const userBtn = document.getElementById('userBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const navLinks = document.querySelectorAll('.nav-link');
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const appSections = document.querySelectorAll('.app-section');

// Elementos admin
const adminNav = document.getElementById('adminNav');
const adminSidebar = document.getElementById('adminSidebar');
const adminTabs = document.querySelectorAll('.admin-tab');
const adminTabContents = document.querySelectorAll('.admin-tab-content');
const addUserBtn = document.getElementById('addUserBtn');
const usersTableBody = document.getElementById('usersTableBody');
const userModal = document.getElementById('userModal');
const modalCloseButtons = document.querySelectorAll('.modal-close');
const userForm = document.getElementById('userForm');

// Elementos de progresso
const dashboardUserName = document.getElementById('dashboardUserName');
const userNameElements = document.querySelectorAll('#userName, #dropdownUserName, #sidebarUserName');
const userRoleElements = document.querySelectorAll('#dropdownUserRole, #sidebarUserRole');
const statExercises = document.getElementById('statExercises');
const statAccuracy = document.getElementById('statAccuracy');
const statTime = document.getElementById('statTime');
const statLevel = document.getElementById('statLevel');
const sidebarLevel = document.getElementById('sidebarLevel');
const sidebarProgress = document.getElementById('sidebarProgress');

// Elementos de aprendizado e jogos
const operationsGrid = document.querySelector('.operations-grid');
const gamesGrid = document.querySelector('.games-grid');

// Notificações
const notificationContainer = document.getElementById('notificationContainer');

// Chart.js instance
let progressChart = null;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initApplication();
});

async function initApplication() {
    // Verificar se já existe admin
    await checkAdminExists();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar Firebase auth state observer
    setupAuthObserver();
    
    // Inicializar gráfico
    initProgressChart();
    
    // Esconder loading após 1.5 segundos
    setTimeout(() => {
        loadingOverlay.classList.remove('active');
    }, 1500);
}

// Verificar se já existe administrador
async function checkAdminExists() {
    try {
        const adminSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .limit(1)
            .get();
        
        adminExists = !adminSnapshot.empty;
        
        // Atualizar UI baseado na existência de admin
        if (adminExists) {
            adminOption.disabled = true;
            adminHint.textContent = "O cadastro de administrador está disponível apenas para administradores existentes";
        } else {
            adminOption.disabled = false;
            adminHint.textContent = "Você está criando o primeiro administrador do sistema";
        }
    } catch (error) {
        console.error("Erro ao verificar administradores:", error);
    }
}

// Configurar observador de autenticação
function setupAuthObserver() {
    if (!auth) return;
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Usuário está logado
            currentUser = user;
            await loadUserData();
            showMainApp();
        } else {
            // Usuário não está logado
            currentUser = null;
            userData = null;
            showAuthScreen();
        }
    });
}

// Configurar todos os event listeners
function setupEventListeners() {
    // Tabs de autenticação
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchAuthTab(tabId);
        });
    });
    
    // Botões de alternar formulário
    document.querySelectorAll('.switch-tab').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchAuthTab(tabId);
        });
    });
    
    // Botões de login
    loginBtn.addEventListener('click', handleEmailLogin);
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    registerBtn.addEventListener('click', handleRegister);
    recoverBtn.addEventListener('click', handlePasswordRecovery);
    
    // Alternar visibilidade de senha
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Navegação
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
    });
    
    sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });
    
    // Menu do usuário
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navegação por links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            switchSection(sectionId);
            
            // Atualizar navegação ativa
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Navegação por sidebar
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            switchSection(sectionId);
            
            // Atualizar navegação ativa
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Fechar sidebar em mobile
            if (window.innerWidth < 768) {
                sidebar.classList.remove('active');
            }
        });
    });
    
    // Tabs admin
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchAdminTab(tabId);
        });
    });
    
    // Modal de usuário
    addUserBtn.addEventListener('click', () => {
        openUserModal();
    });
    
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            userModal.classList.remove('active');
        });
    });
    
    // Formulário de usuário
    userForm.addEventListener('submit', handleUserFormSubmit);
    
    // Fechar modal ao clicar fora
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userModal.classList.remove('active');
        }
    });
    
    // Ações rápidas do dashboard
    document.querySelectorAll('.action-btn').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });
    
    // Aprender com operações (será carregado dinamicamente)
    // Jogos (serão carregados dinamicamente)
}

// Alternar entre tabs de autenticação
function switchAuthTab(tabId) {
    // Atualizar tabs ativas
    authTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Mostrar formulário correspondente
    authForms.forEach(form => {
        if (form.id === `${tabId}Form`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
}

// Login com email e senha
async function handleEmailLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showNotification("Campos obrigatórios", "Preencha todos os campos.", "error");
        return;
    }
    
    try {
        // Configurar persistência de autenticação
        const persistence = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        
        // Fazer login
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        showNotification("Login realizado", "Bem-vindo de volta!", "success");
        
        // Registrar evento no analytics
        if (analytics) {
            analytics.logEvent('login', { method: 'email' });
        }
        
    } catch (error) {
        console.error("Erro no login:", error);
        
        let message = "Erro ao fazer login. Verifique suas credenciais.";
        if (error.code === 'auth/user-not-found') {
            message = "Usuário não encontrado.";
        } else if (error.code === 'auth/wrong-password') {
            message = "Senha incorreta.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Muitas tentativas. Tente novamente mais tarde.";
        }
        
        showNotification("Erro no login", message, "error");
    }
}

// Login com Google
async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const userCredential = await auth.signInWithPopup(provider);
        
        showNotification("Login realizado", "Bem-vindo com Google!", "success");
        
        // Registrar evento no analytics
        if (analytics) {
            analytics.logEvent('login', { method: 'google' });
        }
        
    } catch (error) {
        console.error("Erro no login com Google:", error);
        
        let message = "Erro ao fazer login com Google.";
        if (error.code === 'auth/popup-closed-by-user') {
            message = "Login cancelado.";
        }
        
        showNotification("Erro no login", message, "error");
    }
}

// Cadastro de novo usuário
async function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const userType = document.getElementById('userType').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    // Validações
    if (!name || !email || !password || !confirmPassword || !userType) {
        showNotification("Campos obrigatórios", "Preencha todos os campos.", "error");
        return;
    }
    
    if (!acceptTerms) {
        showNotification("Termos não aceitos", "Você deve aceitar os termos de serviço.", "error");
        return;
    }
    
    if (password.length < 6) {
        showNotification("Senha fraca", "A senha deve ter pelo menos 6 caracteres.", "error");
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification("Senhas diferentes", "As senhas não coincidem.", "error");
        return;
    }
    
    // Validar se é tentativa de cadastro de admin
    if (userType === 'admin' && adminExists) {
        showNotification("Acesso negado", "Apenas administradores podem criar novos administradores.", "error");
        return;
    }
    
    try {
        // Criar usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Preparar dados do usuário
        const userData = {
            uid: user.uid,
            name: name,
            email: email,
            role: userType,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            progress: {
                exercisesCompleted: 0,
                correctAnswers: 0,
                totalAnswers: 0,
                practiceTime: 0,
                level: 1,
                addition: { correct: 0, total: 0 },
                subtraction: { correct: 0, total: 0 },
                multiplication: { correct: 0, total: 0 },
                division: { correct: 0, total: 0 }
            }
        };
        
        // Salvar dados do usuário no Firestore
        await db.collection('users').doc(user.uid).set(userData);
        
        // Atualizar estado de admin se necessário
        if (userType === 'admin') {
            adminExists = true;
            await checkAdminExists();
        }
        
        // Enviar email de verificação
        await user.sendEmailVerification();
        
        showNotification("Cadastro realizado", "Conta criada com sucesso! Verifique seu email.", "success");
        
        // Registrar evento no analytics
        if (analytics) {
            analytics.logEvent('sign_up', { method: 'email' });
        }
        
        // Alternar para tela de login
        switchAuthTab('login');
        
        // Limpar formulário
        document.getElementById('registerForm').reset();
        
    } catch (error) {
        console.error("Erro no cadastro:", error);
        
        let message = "Erro ao criar conta.";
        if (error.code === 'auth/email-already-in-use') {
            message = "Este email já está em uso.";
        } else if (error.code === 'auth/invalid-email') {
            message = "Email inválido.";
        } else if (error.code === 'auth/weak-password') {
            message = "Senha muito fraca.";
        }
        
        showNotification("Erro no cadastro", message, "error");
    }
}

// Recuperação de senha
async function handlePasswordRecovery() {
    const email = document.getElementById('recoverEmail').value;
    
    if (!email) {
        showNotification("Email obrigatório", "Digite seu email para recuperar a senha.", "error");
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showNotification("Email enviado", "Verifique sua caixa de entrada para redefinir sua senha.", "success");
        
        // Alternar para tela de login
        switchAuthTab('login');
        
        // Limpar formulário
        document.getElementById('recoverEmail').value = '';
        
    } catch (error) {
        console.error("Erro na recuperação:", error);
        
        let message = "Erro ao enviar email de recuperação.";
        if (error.code === 'auth/user-not-found') {
            message = "Usuário não encontrado.";
        } else if (error.code === 'auth/invalid-email') {
            message = "Email inválido.";
        }
        
        showNotification("Erro na recuperação", message, "error");
    }
}

// Logout
async function handleLogout() {
    try {
        await auth.signOut();
        showNotification("Logout realizado", "Você saiu da sua conta.", "info");
    } catch (error) {
        console.error("Erro no logout:", error);
        showNotification("Erro", "Não foi possível sair da conta.", "error");
    }
}

// Carregar dados do usuário
async function loadUserData() {
    if (!currentUser || !db) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            updateUserUI();
            loadOperations();
            loadGames();
            
            if (userData.role === 'admin') {
                loadAdminPanel();
            }
            
            // Atualizar último login
            await db.collection('users').doc(currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

// Atualizar UI com dados do usuário
function updateUserUI() {
    if (!userData) return;
    
    // Nome do usuário
    userNameElements.forEach(element => {
        element.textContent = userData.name;
    });
    
    dashboardUserName.textContent = userData.name;
    
    // Tipo de usuário
    const roleText = userData.role === 'admin' ? 'Administrador' : 'Aluno';
    userRoleElements.forEach(element => {
        element.textContent = roleText;
    });
    
    // Mostrar/ocultar seções admin
    if (userData.role === 'admin') {
        adminNav.style.display = 'block';
        adminSidebar.style.display = 'block';
    } else {
        adminNav.style.display = 'none';
        adminSidebar.style.display = 'none';
    }
    
    // Atualizar estatísticas
    if (userData.progress) {
        progressData = userData.progress;
        updateProgressUI();
    }
}

// Atualizar UI de progresso
function updateProgressUI() {
    // Estatísticas do dashboard
    statExercises.textContent = progressData.exercisesCompleted;
    
    const accuracy = progressData.totalAnswers > 0 ?
        Math.round((progressData.correctAnswers / progressData.totalAnswers) * 100) : 0;
    statAccuracy.textContent = `${accuracy}%`;
    
    statTime.textContent = `${Math.floor(progressData.practiceTime / 60)}min`;
    statLevel.textContent = progressData.level;
    
    // Sidebar
    sidebarLevel.textContent = progressData.level;
    const progressPercentage = Math.min((progressData.exercisesCompleted % 100) / 100 * 100, 100);
    sidebarProgress.style.width = `${progressPercentage}%`;
    
    // Atualizar gráfico
    updateProgressChart();
}

// Inicializar gráfico de progresso
function initProgressChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    progressChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Adição', 'Subtração', 'Multiplicação', 'Divisão'],
            datasets: [{
                label: 'Desempenho',
                data: [
                    progressData.addition.correct,
                    progressData.subtraction.correct,
                    progressData.multiplication.correct,
                    progressData.division.correct
                ],
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(67, 97, 238, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Atualizar gráfico de progresso
function updateProgressChart() {
    if (!progressChart) return;
    
    progressChart.data.datasets[0].data = [
        progressData.addition.correct,
        progressData.subtraction.correct,
        progressData.multiplication.correct,
        progressData.division.correct
    ];
    
    progressChart.update();
}

// Carregar operações matemáticas
function loadOperations() {
    const operations = [
        {
            id: 'addition',
            name: 'Adição',
            icon: 'fas fa-plus',
            description: 'Aprenda a somar números de forma simples e eficiente',
            color: '#4ade80'
        },
        {
            id: 'subtraction',
            name: 'Subtração',
            icon: 'fas fa-minus',
            description: 'Domine a arte de subtrair e encontrar diferenças',
            color: '#fbbf24'
        },
        {
            id: 'multiplication',
            name: 'Multiplicação',
            icon: 'fas fa-times',
            description: 'Multiplique seu conhecimento com tabuadas e técnicas',
            color: '#4361ee'
        },
        {
            id: 'division',
            name: 'Divisão',
            icon: 'fas fa-divide',
            description: 'Divida para conquistar: aprenda divisão passo a passo',
            color: '#f87171'
        }
    ];
    
    operationsGrid.innerHTML = operations.map(op => `
        <div class="operation-card" data-operation="${op.id}">
            <div class="operation-icon" style="background: linear-gradient(135deg, ${op.color}, ${op.color}dd)">
                <i class="${op.icon}"></i>
            </div>
            <h3>${op.name}</h3>
            <p>${op.description}</p>
            <button class="btn-operation" onclick="startOperation('${op.id}')">
                <i class="fas fa-play-circle"></i> Começar
            </button>
        </div>
    `).join('');
}

// Carregar jogos
function loadGames() {
    const games = [
        {
            id: 'lightning',
            name: 'Desafio Relâmpago',
            icon: 'fas fa-bolt',
            description: 'Resolva o máximo de multiplicações em 60 segundos!',
            color: '#7209b7'
        },
        {
            id: 'puzzle',
            name: 'Quebra-cabeça da Divisão',
            icon: 'fas fa-puzzle-piece',
            description: 'Complete o quebra-cabeça dividindo números corretamente',
            color: '#fbbf24'
        },
        {
            id: 'championship',
            name: 'Campeonato MathMaster',
            icon: 'fas fa-trophy',
            description: 'Enfrente operações mistas e suba no ranking',
            color: '#4cc9f0'
        }
    ];
    
    gamesGrid.innerHTML = games.map(game => `
        <div class="game-card" data-game="${game.id}">
            <div class="game-header" style="background: linear-gradient(135deg, ${game.color}, ${game.color}dd)">
                <h3>${game.name}</h3>
                <div class="game-stats">
                    <div class="stat-display">
                        <span class="stat-value">60</span>
                        <span class="stat-label">Segundos</span>
                    </div>
                    <div class="stat-display">
                        <span class="stat-value">★</span>
                        <span class="stat-label">Desafio</span>
                    </div>
                </div>
            </div>
            <div class="game-content">
                <div class="game-exercise">
                    <p>${game.description}</p>
                </div>
                <div class="game-controls">
                    <button class="btn-game btn-start" onclick="startGame('${game.id}')">
                        <i class="fas fa-play"></i> Jogar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Iniciar operação matemática
function startOperation(operationId) {
    currentOperation = operationId;
    switchSection('learn');
    
    showNotification(
        "Operação selecionada",
        `Pronto para praticar ${operationId === 'addition' ? 'adição' : 
        operationId === 'subtraction' ? 'subtração' : 
        operationId === 'multiplication' ? 'multiplicação' : 'divisão'}!`,
        "info"
    );
}

// Iniciar jogo
function startGame(gameId) {
    currentGame = gameId;
    
    showNotification(
        "Jogo iniciado",
        `Boa sorte no ${gameId === 'lightning' ? 'Desafio Relâmpago' : 
        gameId === 'puzzle' ? 'Quebra-cabeça da Divisão' : 'Campeonato MathMaster'}!`,
        "info"
    );
}

// Ações rápidas do dashboard
function handleQuickAction(action) {
    switch (action) {
        case 'practice':
            switchSection('learn');
            break;
        case 'games':
            switchSection('games');
            break;
        case 'challenges':
            showNotification("Em breve", "Desafios estarão disponíveis em breve!", "info");
            break;
        case 'progress':
            switchSection('progress');
            break;
    }
}

// Mostrar tela de autenticação
function showAuthScreen() {
    authScreen.classList.add('active');
    mainApp.classList.remove('active');
}

// Mostrar aplicação principal
function showMainApp() {
    authScreen.classList.remove('active');
    mainApp.classList.add('active');
    switchSection('dashboard');
}

// Alternar entre seções
function switchSection(sectionId) {
    // Atualizar seções
    appSections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    // Atualizar navegação ativa
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    currentSection = sectionId;
}

// Alternar entre tabs admin
function switchAdminTab(tabId) {
    // Atualizar tabs ativas
    adminTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Mostrar conteúdo correspondente
    adminTabContents.forEach(content => {
        if (content.id === `admin${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    currentAdminTab = tabId;
    
    // Carregar dados se necessário
    if (tabId === 'users') {
        loadUsers();
    } else if (tabId === 'reports') {
        loadReports();
    }
}

// Carregar painel admin
async function loadAdminPanel() {
    await loadUsers();
    loadReports();
}

// Carregar lista de usuários
async function loadUsers() {
    if (!db || userData?.role !== 'admin') return;
    
    try {
        const usersSnapshot = await db.collection('users').get();
        
        usersTableBody.innerHTML = '';
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const createdAt = user.createdAt?.toDate() || new Date();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role === 'admin' ? 'Administrador' : 'Aluno'}</td>
                <td>${createdAt.toLocaleDateString('pt-BR')}</td>
                <td><span class="user-status status-${user.status}">${user.status === 'active' ? 'Ativo' : user.status === 'inactive' ? 'Inativo' : 'Bloqueado'}</span></td>
                <td class="user-actions">
                    <button class="btn-action btn-edit" onclick="editUser('${doc.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteUser('${doc.id}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            `;
            
            usersTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        showNotification("Erro", "Não foi possível carregar a lista de usuários.", "error");
    }
}

// Carregar relatórios
async function loadReports() {
    if (!db || userData?.role !== 'admin') return;
    
    try {
        // Aqui você pode carregar estatísticas do sistema
        // Por exemplo: total de usuários, atividades recentes, etc.
        
    } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
    }
}

// Abrir modal de usuário
async function openUserModal(userId = null) {
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('userForm');
    
    if (userId) {
        // Modo edição
        modalTitle.textContent = "Editar Usuário";
        
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const user = userDoc.data();
            
            document.getElementById('modalUserName').value = user.name;
            document.getElementById('modalUserEmail').value = user.email;
            document.getElementById('modalUserType').value = user.role;
            document.getElementById('modalUserStatus').value = user.status;
            
            // Salvar userId no formulário para referência
            form.dataset.userId = userId;
            
        } catch (error) {
            console.error("Erro ao carregar usuário:", error);
            showNotification("Erro", "Não foi possível carregar os dados do usuário.", "error");
            return;
        }
    } else {
        // Modo criação
        modalTitle.textContent = "Adicionar Usuário";
        
        // Resetar formulário
        form.reset();
        document.getElementById('modalUserType').value = 'student';
        document.getElementById('modalUserStatus').value = 'active';
        delete form.dataset.userId;
    }
    
    userModal.classList.add('active');
}

// Manipular envio do formulário de usuário
async function handleUserFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const userId = form.dataset.userId;
    const name = document.getElementById('modalUserName').value;
    const email = document.getElementById('modalUserEmail').value;
    const role = document.getElementById('modalUserType').value;
    const status = document.getElementById('modalUserStatus').value;
    
    try {
        if (userId) {
            // Atualizar usuário existente
            await db.collection('users').doc(userId).update({
                name: name,
                email: email,
                role: role,
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification("Sucesso", "Usuário atualizado com sucesso!", "success");
        } else {
            // Criar novo usuário (apenas admin pode fazer isso)
            // Note: Esta funcionalidade requer que o admin crie a conta de autenticação também
            // Para simplificar, estamos apenas criando o documento no Firestore
            // Em uma aplicação real, você precisaria usar o Admin SDK para criar a conta de autenticação
            
            showNotification("Aviso", "Para criar usuários completos, use o Admin SDK do Firebase.", "warning");
        }
        
        // Recarregar lista de usuários
        await loadUsers();
        
        // Fechar modal
        userModal.classList.remove('active');
        
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        showNotification("Erro", "Não foi possível salvar as alterações.", "error");
    }
}

// Editar usuário
function editUser(userId) {
    openUserModal(userId);
}

// Excluir usuário
async function deleteUser(userId) {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
        return;
    }
    
    try {
        await db.collection('users').doc(userId).delete();
        showNotification("Sucesso", "Usuário excluído com sucesso!", "success");
        await loadUsers();
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        showNotification("Erro", "Não foi possível excluir o usuário.", "error");
    }
}

// Mostrar notificação
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    if (type === 'warning') icon = 'fas fa-exclamation-triangle';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Configurar botão de fechar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Funções para atualizar progresso (exemplo)
async function updateProgress(operation, isCorrect) {
    if (!currentUser || !userData) return;
    
    // Atualizar dados locais
    progressData.exercisesCompleted++;
    progressData.totalAnswers++;
    
    if (isCorrect) {
        progressData.correctAnswers++;
    }
    
    progressData[operation].total++;
    if (isCorrect) {
        progressData[operation].correct++;
    }
    
    // Calcular nível baseado em exercícios completados
    progressData.level = Math.floor(progressData.exercisesCompleted / 10) + 1;
    
    // Atualizar UI
    updateProgressUI();
    
    // Salvar no Firestore
    try {
        await db.collection('users').doc(currentUser.uid).update({
            'progress': progressData,
            'updatedAt': firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Erro ao salvar progresso:", error);
    }
}

// Inicializar analytics
if (analytics) {
    analytics.logEvent('app_loaded');
}

// Expor funções globais necessárias
window.startOperation = startOperation;
window.startGame = startGame;
window.editUser = editUser;
window.deleteUser = deleteUser;
