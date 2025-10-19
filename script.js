// Importação do Firebase (certifique-se de incluir no HTML)
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-auth-compat.js"></script>

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD3e5rXGWsaeHHHx5YO3lwKz5poIwZbLiM",
    authDomain: "quiz-informatica-2025.firebaseapp.com",
    projectId: "quiz-informatica-2025",
    storageBucket: "quiz-informatica-2025.firebasestorage.app",
    messagingSenderId: "1006125147967",
    appId: "1:1006125147967:web:539b201776164523e5558a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Estado da aplicação
let currentUser = null;
let currentQuiz = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizTimer = null;
let timeRemaining = 0;
let totalTime = 0;

// Elementos da DOM
const authContainer = document.getElementById('auth-container');
const studentDashboard = document.getElementById('student-dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const quizContainer = document.getElementById('quiz-container');
const quizResult = document.getElementById('quiz-result');
const loading = document.getElementById('loading');

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    initEventListeners();
    
    // Verificar se há um usuário logado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado
            showLoading();
            getUserData(user.uid).then(userData => {
                currentUser = { ...user, ...userData };
                hideLoading();
                showDashboard();
            }).catch(error => {
                hideLoading();
                console.error('Erro ao carregar dados do usuário:', error);
                auth.signOut();
            });
        } else {
            // Nenhum usuário logado
            hideLoading();
            showAuth();
        }
    });
});

// Funções de loading
function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// Inicializar autenticação
function initAuth() {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const adminOption = document.getElementById('admin-option');
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    // Alternar entre login e cadastro
    loginTab.addEventListener('click', () => {
        switchAuthTab('login');
    });
    
    registerTab.addEventListener('click', () => {
        switchAuthTab('register');
    });
    
    // Login
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showError('login-error', 'Por favor, preencha todos os campos.');
            return;
        }
        
        showLoading();
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login bem-sucedido
                document.getElementById('login-error').textContent = '';
                hideLoading();
            })
            .catch((error) => {
                hideLoading();
                showError('login-error', getAuthErrorMessage(error.code));
            });
    });
    
    // Cadastro
    registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const userType = document.getElementById('register-type').value;
        
        if (!name || !email || !password) {
            showError('register-error', 'Por favor, preencha todos os campos.');
            return;
        }
        
        if (password.length < 6) {
            showError('register-error', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        // Verificar se já existe um administrador
        if (userType === 'admin') {
            showLoading();
            checkAdminExists().then(adminExists => {
                if (adminExists) {
                    hideLoading();
                    showError('register-error', 'Já existe um administrador cadastrado.');
                    adminOption.disabled = true;
                    return;
                } else {
                    registerUser(name, email, password, userType);
                }
            });
        } else {
            registerUser(name, email, password, userType);
        }
    });
    
    // Recuperação de senha
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        openForgotPasswordModal();
    });
    
    // Verificar se já existe um administrador
    checkAdminExists().then(adminExists => {
        if (adminExists) {
            adminOption.disabled = true;
        }
    });
}

// Alternar entre abas de autenticação
function switchAuthTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// Registrar novo usuário
function registerUser(name, email, password, userType) {
    showLoading();
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Salvar dados adicionais do usuário no Firestore
            return db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                userType: userType,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            hideLoading();
            document.getElementById('register-error').textContent = '';
            showSuccess('register-error', 'Cadastro realizado com sucesso!');
            
            // Limpar formulário e mudar para login após 2 segundos
            setTimeout(() => {
                document.getElementById('register-form').reset();
                switchAuthTab('login');
            }, 2000);
        })
        .catch((error) => {
            hideLoading();
            showError('register-error', getAuthErrorMessage(error.code));
        });
}

// Verificar se já existe um administrador
function checkAdminExists() {
    return db.collection('users')
        .where('userType', '==', 'admin')
        .get()
        .then(querySnapshot => {
            return !querySnapshot.empty;
        });
}

// Obter dados do usuário
function getUserData(uid) {
    return db.collection('users').doc(uid).get()
        .then(doc => {
            if (doc.exists) {
                return doc.data();
            } else {
                throw new Error('Usuário não encontrado');
            }
        });
}

// Inicializar event listeners
function initEventListeners() {
    // Logout
    document.getElementById('student-logout').addEventListener('click', logout);
    document.getElementById('admin-logout').addEventListener('click', logout);
    
    // Navegação entre abas
    initTabNavigation();
    
    // Modais
    initModals();
    
    // Controles do quiz
    initQuizControls();
    
    // Exportação de questões
    document.getElementById('export-questions-btn').addEventListener('click', exportQuestions);
}

// Inicializar navegação por abas
function initTabNavigation() {
    // Abas do aluno
    document.getElementById('quizzes-tab').addEventListener('click', () => {
        switchTab('quizzes-tab', 'quizzes-section');
        loadQuizzes();
    });
    
    document.getElementById('ranking-tab').addEventListener('click', () => {
        switchTab('ranking-tab', 'ranking-section');
        loadRanking();
    });
    
    document.getElementById('history-tab').addEventListener('click', () => {
        switchTab('history-tab', 'history-section');
        loadUserHistory();
    });
    
    // Abas do administrador
    document.getElementById('manage-quizzes-tab').addEventListener('click', () => {
        switchTab('manage-quizzes-tab', 'manage-quizzes-section');
        loadQuizzesAdmin();
    });
    
    document.getElementById('manage-questions-tab').addEventListener('click', () => {
        switchTab('manage-questions-tab', 'manage-questions-section');
        loadQuestions();
    });
    
    document.getElementById('manage-users-tab').addEventListener('click', () => {
        switchTab('manage-users-tab', 'manage-users-section');
        loadUsers();
    });
    
    document.getElementById('reports-tab').addEventListener('click', () => {
        switchTab('reports-tab', 'reports-section');
        loadReports();
    });
    
    // Botões de ação
    document.getElementById('create-quiz-btn').addEventListener('click', () => {
        openQuizModal();
    });
    
    document.getElementById('add-question-btn').addEventListener('click', () => {
        openQuestionModal();
    });
    
    document.getElementById('import-json-btn').addEventListener('click', () => {
        document.getElementById('json-file').click();
    });
    
    document.getElementById('json-file').addEventListener('change', handleJsonImport);
    
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        showDashboard();
    });
    
    document.getElementById('new-quiz').addEventListener('click', () => {
        showDashboard();
        setTimeout(() => {
            switchTab('quizzes-tab', 'quizzes-section');
            loadQuizzes();
        }, 100);
    });
    
    document.getElementById('review-quiz').addEventListener('click', () => {
        // Implementar revisão de respostas
        alert('Funcionalidade de revisão em desenvolvimento');
    });
}

// Inicializar modais
function initModals() {
    // Modal de quiz
    const quizModal = document.getElementById('quiz-modal');
    const quizCloseBtn = document.querySelector('#quiz-modal .close');
    const quizForm = document.getElementById('quiz-form');
    const cancelQuizBtn = document.getElementById('cancel-quiz');
    
    quizCloseBtn.addEventListener('click', () => closeModal('quiz-modal'));
    cancelQuizBtn.addEventListener('click', () => closeModal('quiz-modal'));
    quizForm.addEventListener('submit', handleQuizSubmit);
    
    // Modal de questão
    const questionModal = document.getElementById('question-modal');
    const questionCloseBtn = document.querySelector('#question-modal .close');
    const questionForm = document.getElementById('question-form');
    const cancelQuestionBtn = document.getElementById('cancel-question');
    
    questionCloseBtn.addEventListener('click', () => closeModal('question-modal'));
    cancelQuestionBtn.addEventListener('click', () => closeModal('question-modal'));
    questionForm.addEventListener('submit', handleQuestionSubmit);
    
    // Modal de usuário
    const userModal = document.getElementById('user-modal');
    const userCloseBtn = document.querySelector('#user-modal .close');
    const userForm = document.getElementById('user-form');
    const cancelUserBtn = document.getElementById('cancel-user');
    
    userCloseBtn.addEventListener('click', () => closeModal('user-modal'));
    cancelUserBtn.addEventListener('click', () => closeModal('user-modal'));
    userForm.addEventListener('submit', handleUserSubmit);
    
    // Modal de recuperação de senha
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const forgotPasswordCloseBtn = document.querySelector('#forgot-password-modal .close');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const cancelResetBtn = document.getElementById('cancel-reset');
    
    forgotPasswordCloseBtn.addEventListener('click', () => closeModal('forgot-password-modal'));
    cancelResetBtn.addEventListener('click', () => closeModal('forgot-password-modal'));
    forgotPasswordForm.addEventListener('submit', handlePasswordReset);
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
}

// Inicializar controles do quiz
function initQuizControls() {
    document.getElementById('prev-question').addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    });
    
    document.getElementById('next-question').addEventListener('click', () => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        }
    });
    
    document.getElementById('finish-quiz').addEventListener('click', finishQuiz);
    
    // Seleção de opções
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            const selectedValue = this.getAttribute('data-value');
            selectOption(selectedValue);
        });
    });
}

// Alternar entre abas
function switchTab(tabId, sectionId) {
    // Remover classe active de todas as abas e seções
    const tabs = document.querySelectorAll('.dashboard-header .tab');
    const sections = document.querySelectorAll('.dashboard-content .section');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    // Adicionar classe active à aba e seção selecionadas
    document.getElementById(tabId).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

// Mostrar tela de autenticação
function showAuth() {
    authContainer.classList.remove('hidden');
    studentDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    quizContainer.classList.add('hidden');
    quizResult.classList.add('hidden');
}

// Mostrar dashboard apropriado
function showDashboard() {
    authContainer.classList.add('hidden');
    quizContainer.classList.add('hidden');
    quizResult.classList.add('hidden');
    
    if (currentUser.userType === 'admin') {
        studentDashboard.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        document.getElementById('admin-name').textContent = currentUser.name;
        loadQuizzesAdmin();
    } else {
        adminDashboard.classList.add('hidden');
        studentDashboard.classList.remove('hidden');
        document.getElementById('student-name').textContent = currentUser.name;
        loadQuizzes();
    }
}

// Fazer logout
function logout() {
    showLoading();
    auth.signOut().then(() => {
        currentUser = null;
        hideLoading();
        showAuth();
    });
}

// Mostrar erro
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'error-message';
}

// Mostrar sucesso
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'success-message';
}

// Obter mensagem de erro amigável
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'E-mail inválido.',
        'auth/user-disabled': 'Esta conta foi desativada.',
        'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/email-already-in-use': 'Este e-mail já está em uso.',
        'auth/weak-password': 'A senha é muito fraca.',
        'auth/operation-not-allowed': 'Operação não permitida.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.'
    };
    
    return messages[errorCode] || 'Ocorreu um erro. Tente novamente.';
}

// Abrir modal
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

// Fechar modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ===============================
// GERENCIAMENTO DE QUIZZES
// ===============================

// Carregar quizzes para alunos
function loadQuizzes() {
    const quizzesList = document.getElementById('quizzes-list');
    quizzesList.innerHTML = '<div class="card"><div class="card-content">Carregando quizzes...</div></div>';
    
    db.collection('quizzes')
        .where('status', '==', 'active')
        .get()
        .then(querySnapshot => {
            quizzesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<div class="card"><div class="card-content">Nenhum quiz disponível no momento.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const quiz = { id: doc.id, ...doc.data() };
                const quizCard = createQuizCard(quiz);
                quizzesList.appendChild(quizCard);
            });
        })
        .catch(error => {
            quizzesList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar quizzes.</div></div>';
            console.error('Erro ao carregar quizzes:', error);
        });
}

// Carregar quizzes para administradores
function loadQuizzesAdmin() {
    const quizzesList = document.getElementById('quizzes-admin-list');
    quizzesList.innerHTML = '<div class="card"><div class="card-content">Carregando quizzes...</div></div>';
    
    db.collection('quizzes').get()
        .then(querySnapshot => {
            quizzesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<div class="card"><div class="card-content">Nenhum quiz criado ainda.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const quiz = { id: doc.id, ...doc.data() };
                const quizCard = createQuizAdminCard(quiz);
                quizzesList.appendChild(quizCard);
            });
        })
        .catch(error => {
            quizzesList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar quizzes.</div></div>';
            console.error('Erro ao carregar quizzes:', error);
        });
}

// Criar card de quiz para alunos
function createQuizCard(quiz) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Verificar se o usuário já iniciou este quiz
    const userQuizRef = db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', 'in', ['in-progress', 'completed']);
    
    userQuizRef.get().then(querySnapshot => {
        let buttonText = 'Iniciar Quiz';
        let buttonClass = 'btn btn-primary';
        let statusText = 'Não iniciado';
        let statusClass = 'card-badge';
        
        if (!querySnapshot.empty) {
            const userQuiz = querySnapshot.docs[0].data();
            
            if (userQuiz.status === 'in-progress') {
                buttonText = 'Continuar Quiz';
                buttonClass = 'btn btn-success';
                statusText = 'Em andamento';
                statusClass = 'card-badge';
            } else if (userQuiz.status === 'completed') {
                buttonText = 'Ver Resultado';
                buttonClass = 'btn btn-secondary';
                statusText = 'Concluído';
                statusClass = 'card-badge';
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${quiz.title}</h3>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="card-content">
                <p>${quiz.description || 'Sem descrição'}</p>
            </div>
            <div class="card-meta">
                <span><i class="fas fa-clock"></i> ${quiz.time} min</span>
                <span><i class="fas fa-question-circle"></i> ${quiz.questionsCount} questões</span>
                <span><i class="fas fa-layer-group"></i> ${quiz.category || 'Geral'}</span>
            </div>
            <div class="card-actions">
                <button class="${buttonClass}" data-quiz-id="${quiz.id}">
                    <i class="fas fa-play"></i>
                    ${buttonText}
                </button>
            </div>
        `;
        
        const button = card.querySelector('button');
        button.addEventListener('click', () => {
            if (buttonText === 'Ver Resultado') {
                showQuizResult(quiz.id);
            } else {
                startQuiz(quiz);
            }
        });
    });
    
    return card;
}

// Criar card de quiz para administradores
function createQuizAdminCard(quiz) {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${quiz.title}</h3>
            <span class="card-badge ${quiz.status === 'active' ? '' : 'card-badge-secondary'}">
                ${quiz.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
        </div>
        <div class="card-content">
            <p>${quiz.description || 'Sem descrição'}</p>
        </div>
        <div class="card-meta">
            <span><i class="fas fa-clock"></i> ${quiz.time} min</span>
            <span><i class="fas fa-question-circle"></i> ${quiz.questionsCount} questões</span>
            <span><i class="fas fa-layer-group"></i> ${quiz.category || 'Geral'}</span>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary" data-action="edit" data-quiz-id="${quiz.id}">
                <i class="fas fa-edit"></i>
                Editar
            </button>
            <button class="btn btn-danger" data-action="delete" data-quiz-id="${quiz.id}">
                <i class="fas fa-trash"></i>
                Excluir
            </button>
            <button class="btn ${quiz.status === 'active' ? 'btn-secondary' : 'btn-success'}" 
                    data-action="toggle-status" data-quiz-id="${quiz.id}">
                <i class="fas fa-power-off"></i>
                ${quiz.status === 'active' ? 'Desativar' : 'Ativar'}
            </button>
        </div>
    `;
    
    // Adicionar event listeners aos botões
    const buttons = card.querySelectorAll('button');
    buttons.forEach(button => {
        const action = button.getAttribute('data-action');
        const quizId = button.getAttribute('data-quiz-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') {
                editQuiz(quizId);
            } else if (action === 'delete') {
                deleteQuiz(quizId);
            } else if (action === 'toggle-status') {
                toggleQuizStatus(quizId, quiz.status);
            }
        });
    });
    
    return card;
}

// Abrir modal de quiz
function openQuizModal(quiz = null) {
    const modal = document.getElementById('quiz-modal');
    const title = document.getElementById('quiz-modal-title');
    const form = document.getElementById('quiz-form');
    
    if (quiz) {
        // Modo edição
        title.textContent = 'Editar Quiz';
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-description').value = quiz.description || '';
        document.getElementById('quiz-time').value = quiz.time;
        document.getElementById('quiz-questions-count').value = quiz.questionsCount;
        document.getElementById('quiz-category').value = quiz.category || '';
        document.getElementById('quiz-status').value = quiz.status;
        form.setAttribute('data-quiz-id', quiz.id);
    } else {
        // Modo criação
        title.textContent = 'Criar Quiz';
        form.reset();
        form.removeAttribute('data-quiz-id');
    }
    
    modal.classList.remove('hidden');
}

// Manipular envio do formulário de quiz
function handleQuizSubmit(e) {
    e.preventDefault();
    saveQuiz();
}

// Salvar quiz
function saveQuiz() {
    const form = document.getElementById('quiz-form');
    const quizId = form.getAttribute('data-quiz-id');
    const quizData = {
        title: document.getElementById('quiz-title').value,
        description: document.getElementById('quiz-description').value,
        time: parseInt(document.getElementById('quiz-time').value),
        questionsCount: parseInt(document.getElementById('quiz-questions-count').value),
        category: document.getElementById('quiz-category').value,
        status: document.getElementById('quiz-status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    showLoading();
    
    if (quizId) {
        // Atualizar quiz existente
        db.collection('quizzes').doc(quizId).update(quizData)
            .then(() => {
                hideLoading();
                closeModal('quiz-modal');
                showSuccessMessage('Quiz atualizado com sucesso!');
                loadQuizzesAdmin();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao atualizar quiz: ' + error.message);
            });
    } else {
        // Criar novo quiz
        quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        quizData.createdBy = currentUser.uid;
        
        db.collection('quizzes').add(quizData)
            .then(() => {
                hideLoading();
                closeModal('quiz-modal');
                showSuccessMessage('Quiz criado com sucesso!');
                loadQuizzesAdmin();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao criar quiz: ' + error.message);
            });
    }
}

// Editar quiz
function editQuiz(quizId) {
    showLoading();
    db.collection('quizzes').doc(quizId).get()
        .then(doc => {
            hideLoading();
            if (doc.exists) {
                const quiz = { id: doc.id, ...doc.data() };
                openQuizModal(quiz);
            }
        })
        .catch(error => {
            hideLoading();
            alert('Erro ao carregar quiz: ' + error.message);
        });
}

// Excluir quiz
function deleteQuiz(quizId) {
    if (confirm('Tem certeza que deseja excluir este quiz?')) {
        showLoading();
        db.collection('quizzes').doc(quizId).delete()
            .then(() => {
                hideLoading();
                showSuccessMessage('Quiz excluído com sucesso!');
                loadQuizzesAdmin();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao excluir quiz: ' + error.message);
            });
    }
}

// Alternar status do quiz
function toggleQuizStatus(quizId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    showLoading();
    db.collection('quizzes').doc(quizId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        hideLoading();
        showSuccessMessage(`Quiz ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
        loadQuizzesAdmin();
    })
    .catch(error => {
        hideLoading();
        alert('Erro ao alterar status do quiz: ' + error.message);
    });
}

// ===============================
// GERENCIAMENTO DE QUESTÕES
// ===============================

// Carregar questões
function loadQuestions() {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = '<div class="card"><div class="card-content">Carregando questões...</div></div>';
    
    db.collection('questions').get()
        .then(querySnapshot => {
            questionsList.innerHTML = '';
            
            if (querySnapshot.empty) {
                questionsList.innerHTML = '<div class="card"><div class="card-content">Nenhuma questão cadastrada ainda.</div></div>';
                return;
            }
            
            const categories = new Set();
            
            querySnapshot.forEach(doc => {
                const question = { id: doc.id, ...doc.data() };
                const questionCard = createQuestionCard(question);
                questionsList.appendChild(questionCard);
                
                if (question.category) {
                    categories.add(question.category);
                }
            });
            
            // Atualizar filtro de categorias
            updateCategoryFilter(Array.from(categories));
        })
        .catch(error => {
            questionsList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar questões.</div></div>';
            console.error('Erro ao carregar questões:', error);
        });
}

// Atualizar filtro de categorias
function updateCategoryFilter(categories) {
    const filter = document.getElementById('category-filter');
    filter.innerHTML = '<option value="">Todas as categorias</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filter.appendChild(option);
    });
}

// Criar card de questão
function createQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${question.text.substring(0, 100)}${question.text.length > 100 ? '...' : ''}</h3>
            <span class="card-badge">${question.difficulty || 'N/A'}</span>
        </div>
        <div class="card-content">
            <p><strong>Categoria:</strong> ${question.category || 'Sem categoria'}</p>
            <p><strong>Resposta correta:</strong> ${question.correctAnswer.toUpperCase()}</p>
            ${question.explanation ? `<p><strong>Explicação:</strong> ${question.explanation}</p>` : ''}
        </div>
        <div class="card-meta">
            <span><i class="fas fa-calendar"></i> ${question.createdAt ? question.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</span>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary" data-action="edit" data-question-id="${question.id}">
                <i class="fas fa-edit"></i>
                Editar
            </button>
            <button class="btn btn-danger" data-action="delete" data-question-id="${question.id}">
                <i class="fas fa-trash"></i>
                Excluir
            </button>
        </div>
    `;
    
    // Adicionar event listeners aos botões
    const buttons = card.querySelectorAll('button');
    buttons.forEach(button => {
        const action = button.getAttribute('data-action');
        const questionId = button.getAttribute('data-question-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') {
                editQuestion(questionId);
            } else if (action === 'delete') {
                deleteQuestion(questionId);
            }
        });
    });
    
    return card;
}

// Abrir modal de questão
function openQuestionModal(question = null) {
    const modal = document.getElementById('question-modal');
    const title = document.getElementById('question-modal-title');
    const form = document.getElementById('question-form');
    
    if (question) {
        // Modo edição
        title.textContent = 'Editar Questão';
        document.getElementById('question-text').value = question.text;
        document.getElementById('option-a').value = question.options.a;
        document.getElementById('option-b').value = question.options.b;
        document.getElementById('option-c').value = question.options.c;
        document.getElementById('option-d').value = question.options.d;
        document.getElementById('correct-answer').value = question.correctAnswer;
        document.getElementById('question-category').value = question.category || '';
        document.getElementById('question-explanation').value = question.explanation || '';
        document.getElementById('question-difficulty').value = question.difficulty || 'fácil';
        form.setAttribute('data-question-id', question.id);
    } else {
        // Modo criação
        title.textContent = 'Adicionar Questão';
        form.reset();
        form.removeAttribute('data-question-id');
    }
    
    modal.classList.remove('hidden');
}

// Manipular envio do formulário de questão
function handleQuestionSubmit(e) {
    e.preventDefault();
    saveQuestion();
}

// Salvar questão
function saveQuestion() {
    const form = document.getElementById('question-form');
    const questionId = form.getAttribute('data-question-id');
    const questionData = {
        text: document.getElementById('question-text').value,
        options: {
            a: document.getElementById('option-a').value,
            b: document.getElementById('option-b').value,
            c: document.getElementById('option-c').value,
            d: document.getElementById('option-d').value
        },
        correctAnswer: document.getElementById('correct-answer').value,
        category: document.getElementById('question-category').value,
        explanation: document.getElementById('question-explanation').value,
        difficulty: document.getElementById('question-difficulty').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    showLoading();
    
    if (questionId) {
        // Atualizar questão existente
        db.collection('questions').doc(questionId).update(questionData)
            .then(() => {
                hideLoading();
                closeModal('question-modal');
                showSuccessMessage('Questão atualizada com sucesso!');
                loadQuestions();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao atualizar questão: ' + error.message);
            });
    } else {
        // Criar nova questão
        questionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        questionData.createdBy = currentUser.uid;
        
        db.collection('questions').add(questionData)
            .then(() => {
                hideLoading();
                closeModal('question-modal');
                showSuccessMessage('Questão criada com sucesso!');
                loadQuestions();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao criar questão: ' + error.message);
            });
    }
}

// Editar questão
function editQuestion(questionId) {
    showLoading();
    db.collection('questions').doc(questionId).get()
        .then(doc => {
            hideLoading();
            if (doc.exists) {
                const question = { id: doc.id, ...doc.data() };
                openQuestionModal(question);
            }
        })
        .catch(error => {
            hideLoading();
            alert('Erro ao carregar questão: ' + error.message);
        });
}

// Excluir questão
function deleteQuestion(questionId) {
    if (confirm('Tem certeza que deseja excluir esta questão?')) {
        showLoading();
        db.collection('questions').doc(questionId).delete()
            .then(() => {
                hideLoading();
                showSuccessMessage('Questão excluída com sucesso!');
                loadQuestions();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao excluir questão: ' + error.message);
            });
    }
}

// Importar questões de JSON
function handleJsonImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            let questions = [];

            // Verificar diferentes estruturas possíveis do JSON
            if (Array.isArray(data)) {
                // Estrutura 1: Array direto de questões
                questions = data;
                console.log('Estrutura detectada: Array direto');
            } else if (data.questions && Array.isArray(data.questions)) {
                // Estrutura 2: Objeto com propriedade "questions"
                questions = data.questions;
                console.log('Estrutura detectada: Objeto com propriedade "questions"');
            } else if (data.quizAppQuestions && data.quizAppQuestions.questions && Array.isArray(data.quizAppQuestions.questions)) {
                // Estrutura 3: Objeto com propriedade "quizAppQuestions.questions"
                questions = data.quizAppQuestions.questions;
                console.log('Estrutura detectada: Objeto com propriedade "quizAppQuestions.questions"');
            } else {
                alert('O arquivo JSON deve conter um array de questões na estrutura correta.\n\nEstruturas aceitas:\n1. Array direto de questões\n2. { "questions": [...] }\n3. { "quizAppQuestions": { "questions": [...] } }');
                return;
            }

            if (questions.length === 0) {
                alert('O arquivo JSON não contém questões válidas.');
                return;
            }

            console.log(`Encontradas ${questions.length} questões para importar`);
            
            // Validar estrutura das questões
            const invalidQuestions = [];
            questions.forEach((question, index) => {
                if (!question.text || !question.options || !question.correctAnswer) {
                    invalidQuestions.push(index + 1);
                }
            });

            if (invalidQuestions.length > 0) {
                alert(`Algumas questões estão com estrutura inválida (números: ${invalidQuestions.join(', ')}).\n\nCada questão deve ter: text, options e correctAnswer.`);
                return;
            }

            // Confirmar importação
            if (confirm(`Deseja importar ${questions.length} questões?`)) {
                importQuestions(questions);
            }

        } catch (error) {
            alert('Erro ao processar arquivo JSON: ' + error.message);
            console.error('Erro no JSON:', error);
        }
    };
    reader.onerror = function() {
        alert('Erro ao ler o arquivo. Tente novamente.');
    };
    reader.readAsText(file);

    // Limpar o input para permitir importar o mesmo arquivo novamente
    event.target.value = '';
}

// Importar questões para o Firestore
function importQuestions(questions) {
    let importedCount = 0;
    let errorCount = 0;
    
    showLoading();
    
    const importNext = (index) => {
        if (index >= questions.length) {
            hideLoading();
            const message = `Importação concluída! ${importedCount} questões importadas com sucesso${errorCount > 0 ? `, ${errorCount} erros.` : '.'}`;
            showSuccessMessage(message);
            loadQuestions();
            return;
        }
        
        const question = questions[index];
        
        // Validar estrutura da questão
        if (!question.text || !question.options || !question.correctAnswer) {
            console.error(`Questão ${index} inválida: estrutura incorreta`);
            errorCount++;
            importNext(index + 1);
            return;
        }

        // Validar se as opções estão completas
        if (!question.options.a || !question.options.b || !question.options.c || !question.options.d) {
            console.error(`Questão ${index} inválida: opções incompletas`);
            errorCount++;
            importNext(index + 1);
            return;
        }

        // Validar resposta correta
        if (!['a', 'b', 'c', 'd'].includes(question.correctAnswer.toLowerCase())) {
            console.error(`Questão ${index} inválida: resposta correta deve ser a, b, c ou d`);
            errorCount++;
            importNext(index + 1);
            return;
        }
        
        const questionData = {
            text: question.text,
            options: question.options,
            correctAnswer: question.correctAnswer.toLowerCase(),
            category: question.category || '',
            explanation: question.explanation || '',
            difficulty: question.difficulty || 'fácil',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        };
        
        db.collection('questions').add(questionData)
            .then(() => {
                importedCount++;
                // Atualizar contador visual se necessário
                console.log(`Questão ${index + 1} importada com sucesso`);
                importNext(index + 1);
            })
            .catch(error => {
                errorCount++;
                console.error(`Erro ao importar questão ${index + 1}:`, error);
                importNext(index + 1);
            });
    };
    
    importNext(0);
}

// Exportar questões para JSON
function exportQuestions() {
    showLoading();
    db.collection('questions').get()
        .then(querySnapshot => {
            hideLoading();
            const questions = [];
            
            querySnapshot.forEach(doc => {
                const question = doc.data();
                questions.push({
                    text: question.text,
                    options: question.options,
                    correctAnswer: question.correctAnswer,
                    category: question.category,
                    explanation: question.explanation,
                    difficulty: question.difficulty
                });
            });
            
            const dataStr = JSON.stringify({ questions: questions }, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `questoes_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        })
        .catch(error => {
            hideLoading();
            alert('Erro ao exportar questões: ' + error.message);
        });
}

// ===============================
// GERENCIAMENTO DE USUÁRIOS
// ===============================

// Carregar usuários (apenas para administradores)
function loadUsers() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<div class="card"><div class="card-content">Carregando usuários...</div></div>';
    
    db.collection('users').get()
        .then(querySnapshot => {
            usersList.innerHTML = '';
            
            if (querySnapshot.empty) {
                usersList.innerHTML = '<div class="card"><div class="card-content">Nenhum usuário cadastrado.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userCard = createUserCard(user);
                usersList.appendChild(userCard);
            });
        })
        .catch(error => {
            usersList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar usuários.</div></div>';
            console.error('Erro ao carregar usuários:', error);
        });
}

// Criar card de usuário
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${user.name}</h3>
            <span class="card-badge ${user.userType === 'admin' ? 'card-badge-secondary' : ''}">
                ${user.userType === 'admin' ? 'Administrador' : 'Aluno'}
            </span>
        </div>
        <div class="card-content">
            <p><strong>E-mail:</strong> ${user.email}</p>
            <p><strong>Cadastrado em:</strong> ${user.createdAt ? user.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</p>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary" data-action="edit" data-user-id="${user.id}">
                <i class="fas fa-edit"></i>
                Editar
            </button>
            ${user.userType !== 'admin' ? `
                <button class="btn btn-danger" data-action="delete" data-user-id="${user.id}">
                    <i class="fas fa-trash"></i>
                    Excluir
                </button>
            ` : ''}
        </div>
    `;
    
    // Adicionar event listeners aos botões
    const buttons = card.querySelectorAll('button');
    buttons.forEach(button => {
        const action = button.getAttribute('data-action');
        const userId = button.getAttribute('data-user-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') {
                editUser(userId);
            } else if (action === 'delete') {
                deleteUser(userId);
            }
        });
    });
    
    return card;
}

// Abrir modal de usuário
function openUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    
    if (user) {
        // Modo edição
        title.textContent = 'Editar Usuário';
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-type').value = user.userType;
        form.setAttribute('data-user-id', user.id);
    } else {
        // Modo criação
        title.textContent = 'Adicionar Usuário';
        form.reset();
        form.removeAttribute('data-user-id');
    }
    
    modal.classList.remove('hidden');
}

// Manipular envio do formulário de usuário
function handleUserSubmit(e) {
    e.preventDefault();
    saveUser();
}

// Salvar usuário
function saveUser() {
    const form = document.getElementById('user-form');
    const userId = form.getAttribute('data-user-id');
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const userType = document.getElementById('user-type').value;
    
    if (!name || !email) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    showLoading();
    
    const userData = {
        name: name,
        email: email,
        userType: userType,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Atualizar no Firestore
    db.collection('users').doc(userId).update(userData)
        .then(() => {
            // Se uma nova senha foi fornecida, atualizar a senha
            if (password) {
                return auth.updatePassword(userId, password);
            } else {
                return Promise.resolve();
            }
        })
        .then(() => {
            hideLoading();
            closeModal('user-modal');
            showSuccessMessage('Usuário atualizado com sucesso!');
            loadUsers();
        })
        .catch(error => {
            hideLoading();
            alert('Erro ao atualizar usuário: ' + error.message);
        });
}

// Editar usuário
function editUser(userId) {
    showLoading();
    db.collection('users').doc(userId).get()
        .then(doc => {
            hideLoading();
            if (doc.exists) {
                const user = { id: doc.id, ...doc.data() };
                openUserModal(user);
            }
        })
        .catch(error => {
            hideLoading();
            alert('Erro ao carregar usuário: ' + error.message);
        });
}

// Excluir usuário
function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        showLoading();
        
        // Excluir do Firestore
        db.collection('users').doc(userId).delete()
            .then(() => {
                hideLoading();
                showSuccessMessage('Usuário excluído com sucesso!');
                loadUsers();
            })
            .catch(error => {
                hideLoading();
                alert('Erro ao excluir usuário: ' + error.message);
            });
    }
}

// ===============================
// RECUPERAÇÃO DE SENHA
// ===============================

// Abrir modal de recuperação de senha
function openForgotPasswordModal() {
    document.getElementById('forgot-password-modal').classList.remove('hidden');
}

// Manipular recuperação de senha
function handlePasswordReset(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    
    if (!email) {
        alert('Por favor, digite seu e-mail.');
        return;
    }
    
    showLoading();
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            hideLoading();
            closeModal('forgot-password-modal');
            alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        })
        .catch((error) => {
            hideLoading();
            alert('Erro ao enviar e-mail de recuperação: ' + getAuthErrorMessage(error.code));
        });
}

// ===============================
// QUIZ - EXECUÇÃO
// ===============================

// Iniciar quiz
function startQuiz(quiz) {
    // Verificar se o usuário já iniciou este quiz
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', 'in', ['in-progress', 'completed'])
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const userQuizDoc = querySnapshot.docs[0];
                const userQuiz = userQuizDoc.data();
                
                if (userQuiz.status === 'completed') {
                    showQuizResult(quiz.id);
                    return;
                } else if (userQuiz.status === 'in-progress') {
                    // Continuar quiz em andamento
                    if (userQuiz.attempts >= 3) {
                        alert('Você já usou todas as 3 tentativas permitidas para este quiz.');
                        return;
                    }
                    
                    currentQuiz = quiz;
                    userAnswers = userQuiz.answers || [];
                    currentQuestionIndex = userQuiz.currentQuestionIndex || 0;
                    
                    // Buscar questões do quiz
                    loadQuizQuestions(quiz.id);
                }
            } else {
                // Iniciar novo quiz
                currentQuiz = quiz;
                userAnswers = new Array(quiz.questionsCount).fill(null);
                currentQuestionIndex = 0;
                
                // Criar registro do quiz do usuário
                db.collection('userQuizzes').add({
                    userId: currentUser.uid,
                    quizId: quiz.id,
                    status: 'in-progress',
                    answers: userAnswers,
                    currentQuestionIndex: 0,
                    startTime: firebase.firestore.FieldValue.serverTimestamp(),
                    attempts: 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    // Buscar questões do quiz
                    loadQuizQuestions(quiz.id);
                })
                .catch(error => {
                    alert('Erro ao iniciar quiz: ' + error.message);
                });
            }
        })
        .catch(error => {
            alert('Erro ao verificar status do quiz: ' + error.message);
        });
}

// Carregar questões do quiz
function loadQuizQuestions(quizId) {
    showLoading();
    
    // Em uma implementação real, você teria uma relação entre quizzes e questões
    // Aqui vamos buscar questões aleatórias do banco
    db.collection('questions').get()
        .then(querySnapshot => {
            hideLoading();
            if (querySnapshot.empty) {
                alert('Nenhuma questão disponível para este quiz.');
                return;
            }
            
            const allQuestions = [];
            querySnapshot.forEach(doc => {
                allQuestions.push({ id: doc.id, ...doc.data() });
            });
            
            // Selecionar questões aleatórias
            currentQuestions = [];
            const questionCount = Math.min(currentQuiz.questionsCount, allQuestions.length);
            
            // Embaralhar questões
            for (let i = allQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
            }
            
            // Selecionar as primeiras N questões
            currentQuestions = allQuestions.slice(0, questionCount);
            
            // Iniciar quiz
            showQuiz();
        })
        .catch(error => {
            hideLoading();
            alert('Erro ao carregar questões: ' + error.message);
        });
}

// Mostrar tela do quiz
function showQuiz() {
    authContainer.classList.add('hidden');
    studentDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    quizResult.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    
    // Configurar informações do quiz
    document.getElementById('quiz-title-display').textContent = currentQuiz.title;
    document.getElementById('quiz-description-display').textContent = currentQuiz.description || '';
    
    // Iniciar timer
    totalTime = currentQuiz.time * 60; // Converter para segundos
    timeRemaining = totalTime;
    startTimer();
    
    // Exibir primeira questão
    displayQuestion();
}

// Iniciar timer do quiz
function startTimer() {
    updateTimerDisplay();
    
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            finishQuiz();
        }
    }, 1000);
}

// Atualizar display do timer
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('quiz-timer').textContent = timerText;
    
    // Atualizar progresso do círculo do timer
    const progress = document.getElementById('timer-progress');
    const circumference = 2 * Math.PI * 28;
    const offset = circumference - (timeRemaining / totalTime) * circumference;
    progress.style.strokeDashoffset = offset;
}

// Exibir questão atual
function displayQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    
    document.getElementById('question-text').textContent = question.text;
    document.getElementById('option-a-text').textContent = question.options.a;
    document.getElementById('option-b-text').textContent = question.options.b;
    document.getElementById('option-c-text').textContent = question.options.c;
    document.getElementById('option-d-text').textContent = question.options.d;
    
    // Atualizar progresso
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('quiz-progress-text').textContent = `Questão ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = currentQuestions.length;
    
    // Limpar seleção anterior
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Restaurar resposta salva, se houver
    if (userAnswers[currentQuestionIndex]) {
        const selectedOption = document.querySelector(`.option[data-value="${userAnswers[currentQuestionIndex]}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
    
    // Atualizar estado dos botões de navegação
    document.getElementById('prev-question').disabled = currentQuestionIndex === 0;
    document.getElementById('next-question').style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'none' : 'flex';
    document.getElementById('finish-quiz').classList.toggle('hidden', currentQuestionIndex !== currentQuestions.length - 1);
}

// Selecionar opção
function selectOption(value) {
    // Limpar seleção anterior
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Selecionar nova opção
    const selectedOption = document.querySelector(`.option[data-value="${value}"]`);
    selectedOption.classList.add('selected');
    
    // Salvar resposta
    userAnswers[currentQuestionIndex] = value;
    
    // Atualizar no Firestore
    updateUserQuizProgress();
}

// Atualizar progresso do quiz do usuário
function updateUserQuizProgress() {
    // Encontrar o documento do userQuiz
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', currentQuiz.id)
        .where('status', '==', 'in-progress')
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return doc.ref.update({
                    answers: userAnswers,
                    currentQuestionIndex: currentQuestionIndex,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar progresso do quiz:', error);
        });
}

// Finalizar quiz
function finishQuiz() {
    clearInterval(quizTimer);
    
    // Calcular pontuação
    let score = 0;
    currentQuestions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
            score++;
        }
    });
    
    const percentage = (score / currentQuestions.length) * 100;
    const timeTaken = totalTime - timeRemaining;
    
    // Atualizar status do quiz do usuário
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', currentQuiz.id)
        .where('status', '==', 'in-progress')
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return doc.ref.update({
                    status: 'completed',
                    score: score,
                    percentage: percentage,
                    timeTaken: timeTaken,
                    completedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .then(() => {
            // Mostrar resultado
            showQuizResult(currentQuiz.id, score, percentage, timeTaken);
        })
        .catch(error => {
            console.error('Erro ao finalizar quiz:', error);
            // Mostrar resultado mesmo com erro
            showQuizResult(currentQuiz.id, score, percentage, timeTaken);
        });
}

// Mostrar resultado do quiz
function showQuizResult(quizId, score = null, percentage = null, timeTaken = null) {
    if (score !== null && percentage !== null) {
        // Exibir resultado recém-calculado
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('score-percentage').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('score-fraction').textContent = `${score}/${currentQuestions.length}`;
        document.getElementById('correct-answers').textContent = score;
        document.getElementById('wrong-answers').textContent = currentQuestions.length - score;
        document.getElementById('time-taken').textContent = timeText;
        
        // Animar o círculo de progresso
        const circleProgress = document.getElementById('circle-progress');
        const degrees = (percentage / 100) * 360;
        circleProgress.style.transform = `rotate(${degrees}deg)`;
        
        quizContainer.classList.add('hidden');
        quizResult.classList.remove('hidden');
    } else {
        // Buscar resultado do Firestore
        db.collection('userQuizzes')
            .where('userId', '==', currentUser.uid)
            .where('quizId', '==', quizId)
            .where('status', '==', 'completed')
            .get()
            .then(querySnapshot => {
                if (!querySnapshot.empty) {
                    const userQuiz = querySnapshot.docs[0].data();
                    
                    document.getElementById('score-percentage').textContent = `${userQuiz.percentage.toFixed(1)}%`;
                    document.getElementById('score-fraction').textContent = `${userQuiz.score}/${currentQuestions.length}`;
                    document.getElementById('correct-answers').textContent = userQuiz.score;
                    document.getElementById('wrong-answers').textContent = currentQuestions.length - userQuiz.score;
                    
                    const minutes = Math.floor(userQuiz.timeTaken / 60);
                    const seconds = userQuiz.timeTaken % 60;
                    document.getElementById('time-taken').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    // Animar o círculo de progresso
                    const circleProgress = document.getElementById('circle-progress');
                    const degrees = (userQuiz.percentage / 100) * 360;
                    circleProgress.style.transform = `rotate(${degrees}deg)`;
                    
                    studentDashboard.classList.add('hidden');
                    quizResult.classList.remove('hidden');
                }
            })
            .catch(error => {
                alert('Erro ao carregar resultado: ' + error.message);
            });
    }
}

// ===============================
// RANKING E RELATÓRIOS
// ===============================

// Carregar ranking
function loadRanking() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<div class="card"><div class="card-content">Carregando ranking...</div></div>';
    
    // Buscar todos os quizzes completados
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(querySnapshot => {
            const userScores = {};
            
            // Calcular pontuação total por usuário
            querySnapshot.forEach(doc => {
                const userQuiz = doc.data();
                const userId = userQuiz.userId;
                
                if (!userScores[userId]) {
                    userScores[userId] = {
                        totalScore: 0,
                        totalQuizzes: 0,
                        userId: userId
                    };
                }
                
                userScores[userId].totalScore += userQuiz.score || 0;
                userScores[userId].totalQuizzes += 1;
            });
            
            // Converter objeto em array e ordenar por pontuação
            const ranking = Object.values(userScores).sort((a, b) => b.totalScore - a.totalScore);
            
            // Buscar informações dos usuários
            const userIds = ranking.map(item => item.userId);
            
            if (userIds.length === 0) {
                rankingList.innerHTML = '<div class="card"><div class="card-content">Nenhum resultado disponível no ranking.</div></div>';
                return;
            }
            
            db.collection('users')
                .where(firebase.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 20)) // Limitar a 20 usuários
                .get()
                .then(usersSnapshot => {
                    const usersMap = {};
                    usersSnapshot.forEach(doc => {
                        usersMap[doc.id] = doc.data();
                    });
                    
                    // Exibir ranking
                    rankingList.innerHTML = '';
                    
                    ranking.slice(0, 20).forEach((item, index) => {
                        const user = usersMap[item.userId];
                        if (!user) return;
                        
                        const rankingItem = document.createElement('div');
                        rankingItem.className = 'ranking-item';
                        
                        // Destacar usuário atual
                        if (item.userId === currentUser.uid) {
                            rankingItem.style.background = 'rgba(74, 108, 247, 0.1)';
                            rankingItem.style.borderLeft = '4px solid var(--primary-color)';
                        }
                        
                        rankingItem.innerHTML = `
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${user.name} ${item.userId === currentUser.uid ? '(Você)' : ''}</div>
                                <div class="ranking-details">${item.totalQuizzes} quiz(s) realizado(s)</div>
                            </div>
                            <div class="ranking-score">${item.totalScore} pts</div>
                        `;
                        
                        rankingList.appendChild(rankingItem);
                    });
                });
        })
        .catch(error => {
            rankingList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar ranking.</div></div>';
            console.error('Erro ao carregar ranking:', error);
        });
}

// Carregar histórico do usuário
function loadUserHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="card"><div class="card-content">Carregando histórico...</div></div>';
    
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'completed')
        .orderBy('completedAt', 'desc')
        .get()
        .then(querySnapshot => {
            historyList.innerHTML = '';
            
            if (querySnapshot.empty) {
                historyList.innerHTML = '<div class="card"><div class="card-content">Nenhum quiz concluído ainda.</div></div>';
                return;
            }
            
            // Buscar informações dos quizzes
            const quizIds = [];
            const userQuizzesMap = {};
            
            querySnapshot.forEach(doc => {
                const userQuiz = { id: doc.id, ...doc.data() };
                quizIds.push(userQuiz.quizId);
                userQuizzesMap[userQuiz.quizId] = userQuiz;
            });
            
            db.collection('quizzes')
                .where(firebase.firestore.FieldPath.documentId(), 'in', quizIds)
                .get()
                .then(quizzesSnapshot => {
                    const quizzesMap = {};
                    quizzesSnapshot.forEach(doc => {
                        quizzesMap[doc.id] = doc.data();
                    });
                    
                    quizIds.forEach(quizId => {
                        const quiz = quizzesMap[quizId];
                        const userQuiz = userQuizzesMap[quizId];
                        
                        if (quiz && userQuiz) {
                            const historyCard = document.createElement('div');
                            historyCard.className = 'card';
                            
                            historyCard.innerHTML = `
                                <div class="card-header">
                                    <h3 class="card-title">${quiz.title}</h3>
                                    <span class="card-badge">${userQuiz.percentage.toFixed(1)}%</span>
                                </div>
                                <div class="card-content">
                                    <p>${quiz.description || 'Sem descrição'}</p>
                                    <p><strong>Pontuação:</strong> ${userQuiz.score}/${quiz.questionsCount}</p>
                                    <p><strong>Concluído em:</strong> ${userQuiz.completedAt.toDate().toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div class="card-actions">
                                    <button class="btn btn-primary" data-quiz-id="${quizId}">
                                        <i class="fas fa-chart-bar"></i>
                                        Ver Detalhes
                                    </button>
                                </div>
                            `;
                            
                            const button = historyCard.querySelector('button');
                            button.addEventListener('click', () => {
                                showQuizResult(quizId);
                            });
                            
                            historyList.appendChild(historyCard);
                        }
                    });
                });
        })
        .catch(error => {
            historyList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar histórico.</div></div>';
            console.error('Erro ao carregar histórico:', error);
        });
}

// Carregar relatórios
function loadReports() {
    // Estatísticas básicas
    loadBasicStats();
    
    // Gráficos (implementação básica)
    loadCharts();
}

// Carregar estatísticas básicas
function loadBasicStats() {
    // Total de usuários
    db.collection('users').get().then(snapshot => {
        document.getElementById('total-users').textContent = snapshot.size;
    });
    
    // Quizzes ativos
    db.collection('quizzes').where('status', '==', 'active').get().then(snapshot => {
        document.getElementById('total-quizzes').textContent = snapshot.size;
    });
    
    // Total de questões
    db.collection('questions').get().then(snapshot => {
        document.getElementById('total-questions').textContent = snapshot.size;
    });
    
    // Total de tentativas
    db.collection('userQuizzes').where('status', '==', 'completed').get().then(snapshot => {
        document.getElementById('total-attempts').textContent = snapshot.size;
    });
}

// Carregar gráficos
function loadCharts() {
    // Implementação básica de gráficos
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Dados de exemplo - em uma implementação real, você buscaria esses dados do Firestore
    const exampleData = {
        labels: ['Matemática', 'Ciências', 'História', 'Geografia', 'Português'],
        datasets: [{
            label: 'Desempenho por Categoria',
            data: [85, 72, 68, 90, 78],
            backgroundColor: [
                'rgba(74, 108, 247, 0.8)',
                'rgba(40, 167, 69, 0.8)',
                'rgba(220, 53, 69, 0.8)',
                'rgba(255, 193, 7, 0.8)',
                'rgba(23, 162, 184, 0.8)'
            ],
            borderColor: [
                'rgba(74, 108, 247, 1)',
                'rgba(40, 167, 69, 1)',
                'rgba(220, 53, 69, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(23, 162, 184, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: exampleData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Função auxiliar para mostrar mensagens de sucesso
function showSuccessMessage(message) {
    // Você pode implementar um sistema de notificação mais sofisticado aqui
    alert(message);
}

// Inicializar busca de questões
document.getElementById('question-search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const questions = document.querySelectorAll('#questions-list .card');
    
    questions.forEach(question => {
        const text = question.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            question.style.display = '';
        } else {
            question.style.display = 'none';
        }
    });
});

// Inicializar filtro de categorias
document.getElementById('category-filter').addEventListener('change', function(e) {
    const selectedCategory = e.target.value;
    const questions = document.querySelectorAll('#questions-list .card');
    
    questions.forEach(question => {
        const category = question.querySelector('.card-content p:first-child').textContent;
        if (!selectedCategory || category.includes(selectedCategory)) {
            question.style.display = '';
        } else {
            question.style.display = 'none';
        }
    });
});
