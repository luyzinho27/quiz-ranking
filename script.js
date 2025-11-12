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
let userQuizId = null;
let availableCategories = new Set();

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
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const adminOption = document.getElementById('admin-option');
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    // Alternar entre login e cadastro
    loginTab.addEventListener('click', () => switchAuthTab('login'));
    registerTab.addEventListener('click', () => switchAuthTab('register'));
    
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
            .then(() => {
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
        
        if (userType === 'admin') {
            showLoading();
            checkAdminExists().then(adminExists => {
                if (adminExists) {
                    hideLoading();
                    showError('register-error', 'Já existe um administrador cadastrado.');
                    adminOption.disabled = true;
                    return;
                }
                registerUser(name, email, password, userType);
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
    
    // Verificar admin existente
    checkAdminExists().then(adminExists => {
        if (adminExists) adminOption.disabled = true;
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
        .then(querySnapshot => !querySnapshot.empty);
}

// Obter dados do usuário
function getUserData(uid) {
    return db.collection('users').doc(uid).get()
        .then(doc => {
            if (doc.exists) return doc.data();
            throw new Error('Usuário não encontrado');
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
    
    // Busca e filtros
    document.getElementById('question-search').addEventListener('input', filterQuestions);
    document.getElementById('category-filter').addEventListener('change', filterQuestions);
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
    document.getElementById('create-quiz-btn').addEventListener('click', () => openQuizModal());
    document.getElementById('add-question-btn').addEventListener('click', () => openQuestionModal());
    document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('json-file').click());
    document.getElementById('json-file').addEventListener('change', handleJsonImport);
    
    // Resultados
    document.getElementById('back-to-dashboard').addEventListener('click', () => showDashboard());
    document.getElementById('new-quiz').addEventListener('click', () => {
        showDashboard();
        setTimeout(() => {
            switchTab('quizzes-tab', 'quizzes-section');
            loadQuizzes();
        }, 100);
    });
    
    document.getElementById('review-quiz').addEventListener('click', () => {
        alert('Funcionalidade de revisão em desenvolvimento');
    });
}

// Inicializar modais
function initModals() {
    // Modal de quiz
    const quizCloseBtn = document.querySelector('#quiz-modal .close');
    const cancelQuizBtn = document.getElementById('cancel-quiz');
    quizCloseBtn.addEventListener('click', () => closeModal('quiz-modal'));
    cancelQuizBtn.addEventListener('click', () => closeModal('quiz-modal'));
    document.getElementById('quiz-form').addEventListener('submit', handleQuizSubmit);
    
    // Modal de questão
    const questionCloseBtn = document.querySelector('#question-modal .close');
    const cancelQuestionBtn = document.getElementById('cancel-question');
    questionCloseBtn.addEventListener('click', () => closeModal('question-modal'));
    cancelQuestionBtn.addEventListener('click', () => closeModal('question-modal'));
    document.getElementById('question-form').addEventListener('submit', handleQuestionSubmit);
    
    // Modal de usuário
    const userCloseBtn = document.querySelector('#user-modal .close');
    const cancelUserBtn = document.getElementById('cancel-user');
    userCloseBtn.addEventListener('click', () => closeModal('user-modal'));
    cancelUserBtn.addEventListener('click', () => closeModal('user-modal'));
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    
    // Modal de recuperação de senha
    const forgotPasswordCloseBtn = document.querySelector('#forgot-password-modal .close');
    const cancelResetBtn = document.getElementById('cancel-reset');
    forgotPasswordCloseBtn.addEventListener('click', () => closeModal('forgot-password-modal'));
    cancelResetBtn.addEventListener('click', () => closeModal('forgot-password-modal'));
    document.getElementById('forgot-password-form').addEventListener('submit', handlePasswordReset);
    
    // Modal de saída do quiz
    const exitQuizCloseBtn = document.querySelector('#exit-quiz-modal .close');
    const cancelExitBtn = document.getElementById('cancel-exit');
    const confirmExitBtn = document.getElementById('confirm-exit');
    exitQuizCloseBtn.addEventListener('click', () => closeModal('exit-quiz-modal'));
    cancelExitBtn.addEventListener('click', () => closeModal('exit-quiz-modal'));
    confirmExitBtn.addEventListener('click', confirmExitQuiz);
    
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
    const tabs = document.querySelectorAll('.dashboard-header .tab');
    const sections = document.querySelectorAll('.dashboard-content .section');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
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
// GERENCIAMENTO DE CATEGORIAS
// ===============================

// Carregar categorias disponíveis
function loadCategories() {
    return db.collection('questions').get()
        .then(querySnapshot => {
            availableCategories.clear();
            
            querySnapshot.forEach(doc => {
                const question = doc.data();
                if (question.category && question.category.trim() !== '') {
                    availableCategories.add(question.category);
                }
            });
            
            updateCategorySelects();
            return Array.from(availableCategories);
        })
        .catch(error => {
            console.error('Erro ao carregar categorias:', error);
            return [];
        });
}

// Atualizar selects de categoria
function updateCategorySelects() {
    const quizCategorySelect = document.getElementById('quiz-category');
    const categoryFilter = document.getElementById('category-filter');
    const categoriesList = document.getElementById('categories-list');
    
    while (quizCategorySelect.children.length > 1) {
        quizCategorySelect.removeChild(quizCategorySelect.lastChild);
    }
    
    while (categoryFilter.children.length > 1) {
        categoryFilter.removeChild(categoryFilter.lastChild);
    }
    
    while (categoriesList.children.length > 0) {
        categoriesList.removeChild(categoriesList.lastChild);
    }
    
    availableCategories.forEach(category => {
        const quizOption = document.createElement('option');
        quizOption.value = category;
        quizOption.textContent = category;
        quizCategorySelect.appendChild(quizOption);
        
        const filterOption = document.createElement('option');
        filterOption.value = category;
        filterOption.textContent = category;
        categoryFilter.appendChild(filterOption);
        
        const datalistOption = document.createElement('option');
        datalistOption.value = category;
        categoriesList.appendChild(datalistOption);
    });
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
    
    const userQuizRef = db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', 'in', ['in-progress', 'completed']);
    
    userQuizRef.get().then(querySnapshot => {
        let buttonText = 'Iniciar Quiz';
        let buttonClass = 'btn btn-primary';
        let statusText = 'Não iniciado';
        
        if (!querySnapshot.empty) {
            const userQuiz = querySnapshot.docs[0].data();
            userQuizId = querySnapshot.docs[0].id;
            
            if (userQuiz.status === 'in-progress') {
                buttonText = 'Continuar Quiz';
                buttonClass = 'btn btn-success';
                statusText = 'Em andamento';
            } else if (userQuiz.status === 'completed') {
                buttonText = 'Ver Resultado';
                buttonClass = 'btn btn-secondary';
                statusText = 'Concluído';
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${quiz.title}</h3>
                <span class="card-badge">${statusText}</span>
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
                    <span class="btn-text">${buttonText}</span>
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
                <span class="btn-text">Editar</span>
            </button>
            <button class="btn btn-danger" data-action="delete" data-quiz-id="${quiz.id}">
                <i class="fas fa-trash"></i>
                <span class="btn-text">Excluir</span>
            </button>
            <button class="btn ${quiz.status === 'active' ? 'btn-secondary' : 'btn-success'}" 
                    data-action="toggle-status" data-quiz-id="${quiz.id}">
                <i class="fas fa-power-off"></i>
                <span class="btn-text">${quiz.status === 'active' ? 'Desativar' : 'Ativar'}</span>
            </button>
        </div>
    `;
    
    card.querySelectorAll('button').forEach(button => {
        const action = button.getAttribute('data-action');
        const quizId = button.getAttribute('data-quiz-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') editQuiz(quizId);
            else if (action === 'delete') deleteQuiz(quizId);
            else if (action === 'toggle-status') toggleQuizStatus(quizId, quiz.status);
        });
    });
    
    return card;
}

// Abrir modal de quiz
function openQuizModal(quiz = null) {
    const modal = document.getElementById('quiz-modal');
    const title = document.getElementById('quiz-modal-title');
    const form = document.getElementById('quiz-form');
    
    loadCategories().then(() => {
        if (quiz) {
            title.textContent = 'Editar Quiz';
            document.getElementById('quiz-title').value = quiz.title;
            document.getElementById('quiz-description').value = quiz.description || '';
            document.getElementById('quiz-time').value = quiz.time;
            document.getElementById('quiz-questions-count').value = quiz.questionsCount;
            document.getElementById('quiz-category').value = quiz.category || '';
            document.getElementById('quiz-status').value = quiz.status;
            form.setAttribute('data-quiz-id', quiz.id);
        } else {
            title.textContent = 'Criar Quiz';
            form.reset();
            form.removeAttribute('data-quiz-id');
        }
        
        modal.classList.remove('hidden');
    });
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
                
                if (question.category) categories.add(question.category);
            });
            
            categories.forEach(category => availableCategories.add(category));
            updateCategorySelects();
        })
        .catch(error => {
            questionsList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar questões.</div></div>';
            console.error('Erro ao carregar questões:', error);
        });
}

// Filtrar questões
function filterQuestions() {
    const searchTerm = document.getElementById('question-search').value.toLowerCase();
    const selectedCategory = document.getElementById('category-filter').value;
    const questions = document.querySelectorAll('#questions-list .card');
    
    questions.forEach(question => {
        const text = question.textContent.toLowerCase();
        const category = question.querySelector('.card-content p:first-child').textContent;
        
        const matchesSearch = text.includes(searchTerm);
        const matchesCategory = !selectedCategory || category.includes(selectedCategory);
        
        question.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
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
                <span class="btn-text">Editar</span>
            </button>
            <button class="btn btn-danger" data-action="delete" data-question-id="${question.id}">
                <i class="fas fa-trash"></i>
                <span class="btn-text">Excluir</span>
            </button>
        </div>
    `;
    
    card.querySelectorAll('button').forEach(button => {
        const action = button.getAttribute('data-action');
        const questionId = button.getAttribute('data-question-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') editQuestion(questionId);
            else if (action === 'delete') deleteQuestion(questionId);
        });
    });
    
    return card;
}

// Abrir modal de questão
function openQuestionModal(question = null) {
    const modal = document.getElementById('question-modal');
    const title = document.getElementById('question-modal-title');
    const form = document.getElementById('question-form');
    
    loadCategories().then(() => {
        if (question) {
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
            title.textContent = 'Adicionar Questão';
            form.reset();
            form.removeAttribute('data-question-id');
        }
        
        modal.classList.remove('hidden');
    });
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

            if (Array.isArray(data)) {
                questions = data;
            } else if (data.questions && Array.isArray(data.questions)) {
                questions = data.questions;
            } else if (data.quizAppQuestions && data.quizAppQuestions.questions && Array.isArray(data.quizAppQuestions.questions)) {
                questions = data.quizAppQuestions.questions;
            } else {
                alert('O arquivo JSON deve conter um array de questões na estrutura correta.');
                return;
            }

            if (questions.length === 0) {
                alert('O arquivo JSON não contém questões válidas.');
                return;
            }
            
            if (confirm(`Deseja importar ${questions.length} questões?`)) {
                importQuestions(questions);
            }

        } catch (error) {
            alert('Erro ao processar arquivo JSON: ' + error.message);
        }
    };
    reader.readAsText(file);
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
            const message = `Importação concluída! ${importedCount} questões importadas${errorCount > 0 ? `, ${errorCount} erros.` : '.'}`;
            showSuccessMessage(message);
            loadQuestions();
            return;
        }
        
        const question = questions[index];
        
        if (!question.text || !question.options || !question.correctAnswer) {
            errorCount++;
            importNext(index + 1);
            return;
        }

        if (!question.options.a || !question.options.b || !question.options.c || !question.options.d) {
            errorCount++;
            importNext(index + 1);
            return;
        }

        if (!['a', 'b', 'c', 'd'].includes(question.correctAnswer.toLowerCase())) {
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
                if (questionData.category && questionData.category.trim() !== '') {
                    availableCategories.add(questionData.category);
                }
                importNext(index + 1);
            })
            .catch(error => {
                errorCount++;
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
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', `questoes_${new Date().toISOString().split('T')[0]}.json`);
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
                <span class="btn-text">Editar</span>
            </button>
            ${user.userType !== 'admin' ? `
                <button class="btn btn-danger" data-action="delete" data-user-id="${user.id}">
                    <i class="fas fa-trash"></i>
                    <span class="btn-text">Excluir</span>
                </button>
            ` : ''}
        </div>
    `;
    
    card.querySelectorAll('button').forEach(button => {
        const action = button.getAttribute('data-action');
        const userId = button.getAttribute('data-user-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') editUser(userId);
            else if (action === 'delete') deleteUser(userId);
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
        title.textContent = 'Editar Usuário';
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-type').value = user.userType;
        form.setAttribute('data-user-id', user.id);
    } else {
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
    
    db.collection('users').doc(userId).update(userData)
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
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        showLoading();
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
// QUIZ - EXECUÇÃO (CORRIGIDO)
// ===============================

// Iniciar quiz
function startQuiz(quiz) {
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', 'in', ['in-progress', 'completed'])
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const userQuizDoc = querySnapshot.docs[0];
                const userQuiz = userQuizDoc.data();
                userQuizId = userQuizDoc.id;
                
                if (userQuiz.status === 'completed') {
                    showQuizResult(quiz.id);
                    return;
                } else if (userQuiz.status === 'in-progress') {
                    if (userQuiz.attempts >= 3) {
                        alert('Você já usou todas as 3 tentativas permitidas para este quiz.');
                        return;
                    }
                    
                    currentQuiz = quiz;
                    userAnswers = userQuiz.answers || [];
                    currentQuestionIndex = userQuiz.currentQuestionIndex || 0;
                    loadQuizQuestions(quiz.id, true);
                }
            } else {
                currentQuiz = quiz;
                userAnswers = new Array(quiz.questionsCount).fill(null);
                currentQuestionIndex = 0;
                
                db.collection('userQuizzes').add({
                    userId:
            /* Reset e estilos gerais */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

:root {
    --primary-color: #4a6cf7;
    --primary-dark: #3a5bd9;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
    --border-color: #dee2e6;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
    --border-radius: 12px;
    --transition: all 0.3s ease;
}

body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #333;
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
}

.container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow-x: hidden;
}

.hidden {
    display: none !important;
}

/* Loading */
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Tela de autenticação */
.auth-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 1rem;
    width: 100%;
}

.auth-header {
    text-align: center;
    margin-bottom: 2rem;
    color: white;
    width: 100%;
    max-width: 450px;
}

.logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.logo i {
    font-size: 2.5rem;
    color: white;
}

.logo h1 {
    font-size: 2rem;
    font-weight: 700;
}

.auth-header p {
    font-size: 1.1rem;
    opacity: 0.9;
}

.auth-box {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 450px;
    overflow: hidden;
}

.tabs {
    display: flex;
    background: var(--light-color);
}

.tab {
    flex: 1;
    background: none;
    border: none;
    padding: 1rem;
    cursor: pointer;
    font-size: 1rem;
    color: var(--secondary-color);
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.tab.active {
    background: white;
    color: var(--primary-color);
    font-weight: 600;
}

.form {
    display: none;
    padding: 2rem;
}

.form.active {
    display: block;
}

.form h2 {
    margin-bottom: 1.5rem;
    text-align: center;
    color: var(--dark-color);
    font-weight: 600;
}

.input-group {
    position: relative;
    margin-bottom: 1.5rem;
    width: 100%;
}

.input-group i {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--secondary-color);
    z-index: 1;
}

.input-group input,
.input-group select,
.input-group textarea {
    width: 100%;
    padding: 1rem 1rem 1rem 3rem;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 1rem;
    transition: var(--transition);
    background: white;
}

.input-group input:focus,
.input-group select:focus,
.input-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
}

.input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--dark-color);
}

.auth-links {
    text-align: center;
    margin-top: 1rem;
}

.auth-links a {
    color: var(--primary-color);
    text-decoration: none;
    transition: var(--transition);
}

.auth-links a:hover {
    color: var(--primary-dark);
}

.auth-footer {
    margin-top: 2rem;
    text-align: center;
    color: white;
    opacity: 0.8;
    width: 100%;
    max-width: 450px;
}

/* Botões */
.btn {
    padding: 1rem 1.5rem;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-decoration: none;
    white-space: nowrap;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.btn-secondary {
    background: var(--secondary-color);
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.btn-success {
    background: var(--success-color);
    color: white;
}

.btn-success:hover {
    background: #218838;
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.btn-danger {
    background: var(--danger-color);
    color: white;
}

.btn-danger:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

/* Dashboard */
.dashboard-header {
    background: white;
    box-shadow: var(--shadow);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    width: 100%;
}

.header-left {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.dashboard-header .logo {
    justify-content: flex-start;
}

.dashboard-header .logo h1 {
    font-size: 1.5rem;
    color: var(--dark-color);
}

.dashboard-header .logo i {
    color: var(--primary-color);
    font-size: 1.8rem;
}

.dashboard-header .tabs {
    background: none;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    display: flex;
    width: 100%;
}

.dashboard-header .tabs::-webkit-scrollbar {
    display: none;
}

.dashboard-header .tab {
    padding: 0.75rem 1rem;
    border-radius: var(--border-radius);
    flex-shrink: 0;
    min-width: auto;
}

.dashboard-header .tab.active {
    background: var(--primary-color);
    color: white;
}

.tab-text {
    display: inline;
}

.user-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
}

.user-details {
    text-align: left;
    flex: 1;
}

.user-name {
    display: block;
    font-weight: 600;
    color: var(--dark-color);
    font-size: 0.9rem;
}

.user-role {
    font-size: 0.8rem;
    color: var(--secondary-color);
}

.dashboard-content {
    flex: 1;
    padding: 1rem;
    background: #f8f9fa;
    width: 100%;
    overflow-x: hidden;
}

.section {
    display: none;
    width: 100%;
}

.section.active {
    display: block;
}

.section-header {
    margin-bottom: 2rem;
    width: 100%;
}

.section-header h2 {
    font-size: 1.5rem;
    color: var(--dark-color);
    margin-bottom: 0.5rem;
}

.section-header p {
    color: var(--secondary-color);
    font-size: 1rem;
}

.action-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
    width: 100%;
}

/* Cards */
.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    width: 100%;
}

.card {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    transition: var(--transition);
    border: 1px solid var(--border-color);
    width: 100%;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.card-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--dark-color);
    margin-bottom: 0.5rem;
    flex: 1;
    min-width: 200px;
}

.card-badge {
    background: var(--primary-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
}

.card-badge-secondary {
    background: var(--secondary-color);
}

.card-content {
    color: var(--secondary-color);
    margin-bottom: 1.5rem;
    word-wrap: break-word;
}

.card-meta {
    display: flex;
    justify-content: space-between;
    color: var(--secondary-color);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    width: 100%;
}

.card-actions .btn {
    flex: 1;
    min-width: 120px;
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

.modal-content {
    background: white;
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    margin: 0;
    color: var(--dark-color);
    font-size: 1.5rem;
}

.close {
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--secondary-color);
    transition: var(--transition);
    background: none;
    border: none;
    padding: 0;
}

.close:hover {
    color: var(--dark-color);
}

.modal-form {
    padding: 1.5rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    flex-wrap: wrap;
}

/* Quiz */
.quiz-header {
    background: white;
    padding: 1rem;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.quiz-info h1 {
    color: var(--dark-color);
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
}

.quiz-info p {
    color: var(--secondary-color);
}

.quiz-controls-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.quiz-timer {
    display: flex;
    align-items: center;
}

.timer-circle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

#timer-progress {
    transition: stroke-dashoffset 1s linear;
}

.quiz-content {
    flex: 1;
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
}

.quiz-progress {
    margin-bottom: 2rem;
    width: 100%;
}

.progress-bar {
    background: var(--border-color);
    border-radius: 10px;
    height: 8px;
    margin-bottom: 0.5rem;
    overflow: hidden;
    width: 100%;
}

.progress-fill {
    background: var(--primary-color);
    height: 100%;
    border-radius: 10px;
    transition: width 0.3s ease;
    width: 0%;
}

.question-container {
    background: white;
    border-radius: var(--border-radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    margin-bottom: 2rem;
    width: 100%;
}

/* Estilos específicos para exibição de questões */
.question-text-container {
    min-height: 80px;
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
}

#question-text {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    color: var(--dark-color);
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    width: 100%;
    font-weight: 500;
    padding: 1rem;
    background: var(--light-color);
    border-left: 5px solid var(--primary-color);
    border-radius: 8px;
}

.options-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.option {
    display: flex;
    align-items: flex-start;
    padding: 1rem 1.5rem;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: var(--transition);
    width: 100%;
    min-height: 60px;
}

.option:hover {
    border-color: var(--primary-color);
    background: rgba(74, 108, 247, 0.05);
}

.option.selected {
    border-color: var(--primary-color);
    background: rgba(74, 108, 247, 0.1);
}

.option-content {
    display: flex;
    align-items: flex-start;
    width: 100%;
    min-height: 60px;
}

.option-letter {
    background: var(--secondary-color);
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1rem;
    font-weight: 600;
    transition: var(--transition);
    flex-shrink: 0;
    margin-top: 0.1rem;
}

.option.selected .option-letter {
    background: var(--primary-color);
}

.option-text {
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    line-height: 1.4;
    padding: 0.25rem 0;
}

.quiz-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    width: 100%;
}

.quiz-nav {
    font-weight: 600;
    color: var(--dark-color);
    flex-shrink: 0;
}

/* Resultado */
.result-container {
    max-width: 600px;
    margin: 1rem auto;
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    width: 100%;
}

.result-header {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
    color: white;
    padding: 2rem 1rem;
    text-align: center;
}

.result-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.result-header h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.result-content {
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
}

.score-circle {
    position: relative;
    width: 150px;
    height: 150px;
}

.circle-background {
    width: 100%;
    height: 100%;
    border: 15px solid var(--border-color);
    border-radius: 50%;
}

.circle-progress {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 15px solid var(--success-color);
    border-radius: 50%;
    clip: rect(0, 75px, 150px, 0);
    transform: rotate(0deg);
    transition: transform 1s ease;
}

.score-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
}

#score-percentage {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark-color);
}

#score-fraction {
    font-size: 0.9rem;
    color: var(--secondary-color);
}

.result-details {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    width: 100%;
    max-width: 400px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--light-color);
    border-radius: var(--border-radius);
}

.detail-label {
    font-weight: 500;
    color: var(--secondary-color);
}

.detail-value {
    font-weight: 600;
    font-size: 1.1rem;
}

.detail-value.correct {
    color: var(--success-color);
}

.detail-value.wrong {
    color: var(--danger-color);
}

.result-actions {
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
}

.result-actions .btn {
    flex: 1;
    min-width: 150px;
}

/* Ranking */
.ranking-container {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    width: 100%;
}

.ranking-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    transition: var(--transition);
    width: 100%;
}

.ranking-item:hover {
    background: var(--light-color);
}

.ranking-item:last-child {
    border-bottom: none;
}

.ranking-position {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--primary-color);
    min-width: 40px;
    text-align: center;
    flex-shrink: 0;
}

.ranking-info {
    flex: 1;
    min-width: 0;
}

.ranking-name {
    font-weight: 600;
    color: var(--dark-color);
    margin-bottom: 0.25rem;
    word-wrap: break-word;
}

.ranking-details {
    font-size: 0.8rem;
    color: var(--secondary-color);
}

.ranking-score {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--dark-color);
    flex-shrink: 0;
}

/* Stats */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
    width: 100%;
}

.stat-card {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
}

.stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    flex-shrink: 0;
}

.stat-info h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark-color);
    margin-bottom: 0.25rem;
}

.stat-info p {
    color: var(--secondary-color);
    margin: 0;
    font-size: 0.9rem;
}

/* Filtros */
.filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    width: 100%;
}

.filters .input-group {
    flex: 1;
    min-width: 200px;
    margin-bottom: 0;
}

/* Estados de erro e sucesso */
.error-message {
    color: var(--danger-color);
    text-align: center;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(220, 53, 69, 0.1);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--danger-color);
}

.success-message {
    color: var(--success-color);
    text-align: center;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(40, 167, 69, 0.1);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--success-color);
}

.info-text {
    color: var(--info-color);
    text-align: center;
    margin: 1rem 0;
    padding: 0.75rem;
    background: rgba(23, 162, 184, 0.1);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--info-color);
}

/* Responsividade */
@media (min-width: 768px) {
    .dashboard-header {
        flex-direction: row;
        justify-content: space-between;
        padding: 1rem 2rem;
    }
    
    .header-left {
        flex-direction: row;
        align-items: center;
        gap: 2rem;
    }
    
    .dashboard-header .tabs {
        overflow-x: visible;
    }
    
    .user-info {
        justify-content: flex-end;
        width: auto;
    }
    
    .user-details {
        text-align: right;
    }
    
    .dashboard-content {
        padding: 2rem;
    }
    
    .section-header h2 {
        font-size: 2rem;
    }
    
    .form-row {
        grid-template-columns: 1fr 1fr;
    }
    
    .quiz-header {
        flex-direction: row;
        justify-content: space-between;
        padding: 2rem;
    }
    
    .quiz-controls-top {
        flex-wrap: nowrap;
    }
    
    .quiz-content {
        padding: 2rem;
    }
    
    #question-text {
        font-size: 1.4rem;
    }
    
    .result-details {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .result-actions {
        flex-direction: row;
    }
    
    .modal-content {
        margin: 2rem;
    }
}

@media (min-width: 1024px) {
    .cards-container {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    }
    
    .stats-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

@media (max-width: 480px) {
    .auth-wrapper {
        padding: 0.5rem;
    }
    
    .auth-box {
        max-width: 100%;
    }
    
    .form {
        padding: 1.5rem;
    }
    
    .logo h1 {
        font-size: 1.8rem;
    }
    
    .section-header h2 {
        font-size: 1.3rem;
    }
    
    .card-actions {
        flex-direction: column;
    }
    
    .card-actions .btn {
        width: 100%;
    }
    
    .modal-actions {
        flex-direction: column;
    }
    
    .modal-actions .btn {
        width: 100%;
    }
    
    .btn .btn-text {
        display: inline;
    }
    
    /* Melhorar responsividade para questões longas */
    #question-text {
        font-size: 1.1rem;
        line-height: 1.5;
        padding: 0.75rem;
    }
    
    .option {
        padding: 0.75rem 1rem;
    }
    
    .option-text {
        font-size: 0.9rem;
    }
}

/* Animações */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.section.active {
    animation: fadeIn 0.5s ease;
}

.card {
    animation: fadeIn 0.3s ease;
}

/* Esconder texto em botões em telas muito pequenas */
@media (max-width: 360px) {
    .btn .btn-text {
        display: none;
    }
    
    .tab .tab-text {
        display: none;
    }
    
    .btn, .tab {
        padding: 0.75rem;
    }
}
