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

// ===============================
// FUNÇÕES BÁSICAS
// ===============================

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'error-message';
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'success-message';
}

function showSuccessMessage(message) {
    alert(message);
}

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

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function switchTab(tabId, sectionId) {
    const tabs = document.querySelectorAll('.dashboard-header .tab');
    const sections = document.querySelectorAll('.dashboard-content .section');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

function showAuth() {
    authContainer.classList.remove('hidden');
    studentDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    quizContainer.classList.add('hidden');
    quizResult.classList.add('hidden');
}

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

function logout() {
    showLoading();
    auth.signOut().then(() => {
        currentUser = null;
        hideLoading();
        showAuth();
    });
}

// ===============================
// AUTENTICAÇÃO
// ===============================

function initAuth() {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    loginTab.addEventListener('click', () => switchAuthTab('login'));
    registerTab.addEventListener('click', () => switchAuthTab('register'));
    
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
                    document.getElementById('admin-option').disabled = true;
                    return;
                } else {
                    registerUser(name, email, password, userType);
                }
            });
        } else {
            registerUser(name, email, password, userType);
        }
    });
    
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        openForgotPasswordModal();
    });
    
    checkAdminExists().then(adminExists => {
        if (adminExists) {
            document.getElementById('admin-option').disabled = true;
        }
    });
}

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

function checkAdminExists() {
    return db.collection('users')
        .where('userType', '==', 'admin')
        .get()
        .then(querySnapshot => !querySnapshot.empty);
}

function getUserData(uid) {
    return db.collection('users').doc(uid).get()
        .then(doc => {
            if (doc.exists) return doc.data();
            throw new Error('Usuário não encontrado');
        });
}

// ===============================
// EVENT LISTENERS E NAVEGAÇÃO
// ===============================

function initEventListeners() {
    document.getElementById('student-logout').addEventListener('click', logout);
    document.getElementById('admin-logout').addEventListener('click', logout);
    
    initTabNavigation();
    initModals();
    initQuizControls();
    
    document.getElementById('export-questions-btn').addEventListener('click', exportQuestions);
    document.getElementById('question-search').addEventListener('input', filterQuestions);
    document.getElementById('category-filter').addEventListener('change', filterQuestions);
}

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
    document.getElementById('back-to-dashboard').addEventListener('click', () => showDashboard());
    document.getElementById('new-quiz').addEventListener('click', () => {
        showDashboard();
        setTimeout(() => {
            switchTab('quizzes-tab', 'quizzes-section');
            loadQuizzes();
        }, 100);
    });
    document.getElementById('review-quiz').addEventListener('click', () => alert('Funcionalidade de revisão em desenvolvimento'));
}

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
    
    // Modal de saída do quiz
    const exitQuizModal = document.getElementById('exit-quiz-modal');
    const exitQuizCloseBtn = document.querySelector('#exit-quiz-modal .close');
    const cancelExitBtn = document.getElementById('cancel-exit');
    const confirmExitBtn = document.getElementById('confirm-exit');
    
    exitQuizCloseBtn.addEventListener('click', () => closeModal('exit-quiz-modal'));
    cancelExitBtn.addEventListener('click', () => closeModal('exit-quiz-modal'));
    confirmExitBtn.addEventListener('click', confirmExitQuiz);
    
    document.getElementById('exit-quiz-btn').addEventListener('click', openExitQuizModal);
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
}

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
    
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            const selectedValue = this.getAttribute('data-value');
            selectOption(selectedValue);
        });
    });
}

// ===============================
// GERENCIAMENTO DE CATEGORIAS
// ===============================

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

function updateCategorySelects() {
    const quizCategorySelect = document.getElementById('quiz-category');
    const categoryFilter = document.getElementById('category-filter');
    const categoriesList = document.getElementById('categories-list');
    
    while (quizCategorySelect.children.length > 1) quizCategorySelect.removeChild(quizCategorySelect.lastChild);
    while (categoryFilter.children.length > 1) categoryFilter.removeChild(categoryFilter.lastChild);
    while (categoriesList.children.length > 0) categoriesList.removeChild(categoriesList.lastChild);
    
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
        let statusClass = 'card-badge';
        
        if (!querySnapshot.empty) {
            const userQuiz = querySnapshot.docs[0].data();
            userQuizId = querySnapshot.docs[0].id;
            
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
    
    const buttons = card.querySelectorAll('button');
    buttons.forEach(button => {
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

function handleQuizSubmit(e) {
    e.preventDefault();
    saveQuiz();
}

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

function filterQuestions() {
    const searchTerm = document.getElementById('question-search').value.toLowerCase();
    const selectedCategory = document.getElementById('category-filter').value;
    const questions = document.querySelectorAll('#questions-list .card');
    
    questions.forEach(question => {
        const text = question.textContent.toLowerCase();
        const category = question.querySelector('.card-content p:first-child').textContent;
        
        const matchesSearch = text.includes(searchTerm);
        const matchesCategory = !selectedCategory || category.includes(selectedCategory);
        
        if (matchesSearch && matchesCategory) question.style.display = '';
        else question.style.display = 'none';
    });
}

function createQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${question.text ? question.text.substring(0, 100) + (question.text.length > 100 ? '...' : '') : 'Sem texto'}</h3>
            <span class="card-badge">${question.difficulty || 'N/A'}</span>
        </div>
        <div class="card-content">
            <p><strong>Categoria:</strong> ${question.category || 'Sem categoria'}</p>
            <p><strong>Resposta correta:</strong> ${question.correctAnswer ? question.correctAnswer.toUpperCase() : 'N/A'}</p>
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
    
    const buttons = card.querySelectorAll('button');
    buttons.forEach(button => {
        const action = button.getAttribute('data-action');
        const questionId = button.getAttribute('data-question-id');
        
        button.addEventListener('click', () => {
            if (action === 'edit') editQuestion(questionId);
            else if (action === 'delete') deleteQuestion(questionId);
        });
    });
    
    return card;
}

function openQuestionModal(question = null) {
    const modal = document.getElementById('question-modal');
    const title = document.getElementById('question-modal-title');
    const form = document.getElementById('question-form');
    
    loadCategories().then(() => {
        if (question) {
            title.textContent = 'Editar Questão';
            document.getElementById('question-text').value = question.text || '';
            document.getElementById('option-a').value = question.options?.a || '';
            document.getElementById('option-b').value = question.options?.b || '';
            document.getElementById('option-c').value = question.options?.c || '';
            document.getElementById('option-d').value = question.options?.d || '';
            document.getElementById('correct-answer').value = question.correctAnswer || '';
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

function handleQuestionSubmit(e) {
    e.preventDefault();
    saveQuestion();
}

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

function handleJsonImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            let questions = [];

            if (Array.isArray(data)) questions = data;
            else if (data.questions && Array.isArray(data.questions)) questions = data.questions;
            else if (data.quizAppQuestions && data.quizAppQuestions.questions && Array.isArray(data.quizAppQuestions.questions)) questions = data.quizAppQuestions.questions;
            else {
                alert('O arquivo JSON deve conter um array de questões na estrutura correta.');
                return;
            }

            if (questions.length === 0) {
                alert('O arquivo JSON não contém questões válidas.');
                return;
            }

            const invalidQuestions = [];
            questions.forEach((question, index) => {
                if (!question.text || !question.options || !question.correctAnswer) invalidQuestions.push(index + 1);
            });

            if (invalidQuestions.length > 0) {
                alert(`Algumas questões estão com estrutura inválida (números: ${invalidQuestions.join(', ')}).\n\nCada questão deve ter: text, options e correctAnswer.`);
                return;
            }

            if (confirm(`Deseja importar ${questions.length} questões?`)) importQuestions(questions);

        } catch (error) {
            alert('Erro ao processar arquivo JSON: ' + error.message);
            console.error('Erro no JSON:', error);
        }
    };
    reader.onerror = function() { alert('Erro ao ler o arquivo. Tente novamente.'); };
    reader.readAsText(file);
    event.target.value = '';
}

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
        
        if (!question.text || !question.options || !question.correctAnswer) {
            console.error(`Questão ${index} inválida: estrutura incorreta`);
            errorCount++;
            importNext(index + 1);
            return;
        }

        if (!question.options.a || !question.options.b || !question.options.c || !question.options.d) {
            console.error(`Questão ${index} inválida: opções incompletas`);
            errorCount++;
            importNext(index + 1);
            return;
        }

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
                if (questionData.category && questionData.category.trim() !== '') availableCategories.add(questionData.category);
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
// QUIZ - EXECUÇÃO (FUNÇÕES CRÍTICAS CORRIGIDAS)
// ===============================

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
                    userId: currentUser.uid,
                    quizId: quiz.id,
                    status: 'in-progress',
                    answers: userAnswers,
                    currentQuestionIndex: 0,
                    startTime: firebase.firestore.FieldValue.serverTimestamp(),
                    attempts: 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then((docRef) => {
                    userQuizId = docRef.id;
                    loadQuizQuestions(quiz.id, false);
                })
                .catch(error => alert('Erro ao iniciar quiz: ' + error.message));
            }
        })
        .catch(error => alert('Erro ao verificar status do quiz: ' + error.message));
}

// FUNÇÃO CRÍTICA - CARREGAMENTO DE QUESTÕES CORRIGIDA
function loadQuizQuestions(quizId, isResuming = false) {
    showLoading();
    console.log('Iniciando carregamento de questões para o quiz:', currentQuiz.title);
    
    // Buscar TODAS as questões disponíveis primeiro
    let questionsQuery = db.collection('questions');
    
    // Se o quiz tem categoria, filtrar por ela
    if (currentQuiz.category && currentQuiz.category.trim() !== '') {
        console.log('Filtrando por categoria:', currentQuiz.category);
        questionsQuery = questionsQuery.where('category', '==', currentQuiz.category);
    }
    
    questionsQuery.get()
        .then(querySnapshot => {
            console.log('Questões encontradas no Firestore:', querySnapshot.size);
            
            if (querySnapshot.empty) {
                hideLoading();
                alert('Nenhuma questão disponível para este quiz. Verifique a categoria ou adicione questões.');
                return;
            }
            
            const allQuestions = [];
            querySnapshot.forEach(doc => {
                const questionData = doc.data();
                console.log('Questão carregada:', {
                    id: doc.id,
                    text: questionData.text,
                    options: questionData.options,
                    correctAnswer: questionData.correctAnswer
                });
                
                allQuestions.push({
                    id: doc.id,
                    text: questionData.text,
                    options: questionData.options,
                    correctAnswer: questionData.correctAnswer,
                    category: questionData.category,
                    explanation: questionData.explanation,
                    difficulty: questionData.difficulty
                });
            });
            
            // Selecionar questões aleatórias
            const questionCount = Math.min(currentQuiz.questionsCount, allQuestions.length);
            console.log(`Selecionando ${questionCount} questões de ${allQuestions.length} disponíveis`);
            
            // Embaralhar questões
            const shuffledQuestions = [...allQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            
            currentQuestions = shuffledQuestions.slice(0, questionCount);
            console.log('Questões selecionadas para o quiz:', currentQuestions);
            
            // Ajustar array de respostas
            if (!isResuming) {
                userAnswers = new Array(currentQuestions.length).fill(null);
            } else {
                if (userAnswers.length !== currentQuestions.length) {
                    const newAnswers = new Array(currentQuestions.length).fill(null);
                    for (let i = 0; i < Math.min(userAnswers.length, currentQuestions.length); i++) {
                        newAnswers[i] = userAnswers[i];
                    }
                    userAnswers = newAnswers;
                }
            }
            
            hideLoading();
            showQuiz();
        })
        .catch(error => {
            hideLoading();
            console.error('Erro detalhado ao carregar questões:', error);
            alert('Erro ao carregar questões do banco de dados: ' + error.message);
        });
}

function showQuiz() {
    authContainer.classList.add('hidden');
    studentDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    quizResult.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    
    document.getElementById('quiz-title-display').textContent = currentQuiz.title;
    document.getElementById('quiz-description-display').textContent = currentQuiz.description || '';
    
    totalTime = currentQuiz.time * 60;
    timeRemaining = totalTime;
    startTimer();
    
    displayQuestion();
}

function startTimer() {
    updateTimerDisplay();
    
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) finishQuiz();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('quiz-timer').textContent = timerText;
    
    const progress = document.getElementById('timer-progress');
    const circumference = 2 * Math.PI * 28;
    const offset = circumference - (timeRemaining / totalTime) * circumference;
    progress.style.strokeDashoffset = offset;
}

// FUNÇÃO CRÍTICA - EXIBIÇÃO DE QUESTÕES CORRIGIDA
function displayQuestion() {
    console.log('Exibindo questão:', currentQuestionIndex, 'de', currentQuestions.length);
    
    if (!currentQuestions || currentQuestions.length === 0 || currentQuestionIndex >= currentQuestions.length) {
        console.error('Erro: Nenhuma questão disponível para exibir');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    console.log('Dados da questão atual:', question);
    
    // VERIFICAÇÃO CRÍTICA - Garantir que os dados existem
    if (!question) {
        console.error('Questão não encontrada no índice:', currentQuestionIndex);
        return;
    }
    
    // EXIBIR O TEXTO DA QUESTÃO
    const questionTextElement = document.getElementById('question-text');
    if (questionTextElement) {
        questionTextElement.textContent = question.text || 'Texto da questão não disponível';
        console.log('Texto da questão definido:', question.text);
    }
    
    // EXIBIR AS OPÇÕES
    const optionATextElement = document.getElementById('option-a-text');
    const optionBTextElement = document.getElementById('option-b-text');
    const optionCTextElement = document.getElementById('option-c-text');
    const optionDTextElement = document.getElementById('option-d-text');
    
    if (optionATextElement) optionATextElement.textContent = question.options?.a || 'Opção A';
    if (optionBTextElement) optionBTextElement.textContent = question.options?.b || 'Opção B';
    if (optionCTextElement) optionCTextElement.textContent = question.options?.c || 'Opção C';
    if (optionDTextElement) optionDTextElement.textContent = question.options?.d || 'Opção D';
    
    // Atualizar progresso
    updateQuizProgress();
    
    // Limpar seleção anterior
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Restaurar resposta salva
    if (userAnswers[currentQuestionIndex]) {
        const selectedOption = document.querySelector(`.option[data-value="${userAnswers[currentQuestionIndex]}"]`);
        if (selectedOption) selectedOption.classList.add('selected');
    }
    
    // Atualizar botões de navegação
    updateNavigationButtons();
}

function updateQuizProgress() {
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('quiz-progress-text');
    const currentQuestionElement = document.getElementById('current-question');
    const totalQuestionsElement = document.getElementById('total-questions');
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `Questão ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    if (currentQuestionElement) currentQuestionElement.textContent = currentQuestionIndex + 1;
    if (totalQuestionsElement) totalQuestionsElement.textContent = currentQuestions.length;
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const finishButton = document.getElementById('finish-quiz');
    
    if (prevButton) prevButton.disabled = currentQuestionIndex === 0;
    if (nextButton) nextButton.style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'none' : 'flex';
    if (finishButton) finishButton.classList.toggle('hidden', currentQuestionIndex !== currentQuestions.length - 1);
}

function selectOption(value) {
    document.querySelectorAll('.option').forEach(option => option.classList.remove('selected'));
    
    const selectedOption = document.querySelector(`.option[data-value="${value}"]`);
    if (selectedOption) selectedOption.classList.add('selected');
    
    userAnswers[currentQuestionIndex] = value;
    updateUserQuizProgress();
}

function updateUserQuizProgress() {
    if (!userQuizId) return;
    
    db.collection('userQuizzes').doc(userQuizId).update({
        answers: userAnswers,
        currentQuestionIndex: currentQuestionIndex,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error('Erro ao atualizar progresso do quiz:', error));
}

function openExitQuizModal() {
    db.collection('userQuizzes').doc(userQuizId).get()
        .then(doc => {
            if (doc.exists) {
                const userQuiz = doc.data();
                const remainingAttempts = 3 - userQuiz.attempts;
                document.getElementById('remaining-attempts').textContent = remainingAttempts;
                openModal('exit-quiz-modal');
            }
        })
        .catch(error => {
            console.error('Erro ao buscar informações do quiz:', error);
            openModal('exit-quiz-modal');
        });
}

function confirmExitQuiz() {
    clearInterval(quizTimer);
    closeModal('exit-quiz-modal');
    showDashboard();
}

function finishQuiz() {
    clearInterval(quizTimer);
    
    let score = 0;
    currentQuestions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) score++;
    });
    
    const percentage = (score / currentQuestions.length) * 100;
    const timeTaken = totalTime - timeRemaining;
    
    db.collection('userQuizzes').doc(userQuizId).update({
        status: 'completed',
        score: score,
        percentage: percentage,
        timeTaken: timeTaken,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => showQuizResult(currentQuiz.id, score, percentage, timeTaken))
    .catch(error => {
        console.error('Erro ao finalizar quiz:', error);
        showQuizResult(currentQuiz.id, score, percentage, timeTaken);
    });
}

function showQuizResult(quizId, score = null, percentage = null, timeTaken = null) {
    if (score !== null && percentage !== null) {
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('score-percentage').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('score-fraction').textContent = `${score}/${currentQuestions.length}`;
        document.getElementById('correct-answers').textContent = score;
        document.getElementById('wrong-answers').textContent = currentQuestions.length - score;
        document.getElementById('time-taken').textContent = timeText;
        
        const circleProgress = document.getElementById('circle-progress');
        const degrees = (percentage / 100) * 360;
        circleProgress.style.transform = `rotate(${degrees}deg)`;
        
        quizContainer.classList.add('hidden');
        quizResult.classList.remove('hidden');
    } else {
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
                    
                    const circleProgress = document.getElementById('circle-progress');
                    const degrees = (userQuiz.percentage / 100) * 360;
                    circleProgress.style.transform = `rotate(${degrees}deg)`;
                    
                    studentDashboard.classList.add('hidden');
                    quizResult.classList.remove('hidden');
                }
            })
            .catch(error => alert('Erro ao carregar resultado: ' + error.message));
    }
}

// ===============================
// FUNÇÕES RESTANTES
// ===============================

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

function handleUserSubmit(e) {
    e.preventDefault();
    saveUser();
}

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

function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
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

function loadRanking() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<div class="card"><div class="card-content">Carregando ranking...</div></div>';
    
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(querySnapshot => {
            const userScores = {};
            
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
            
            const ranking = Object.values(userScores).sort((a, b) => b.totalScore - a.totalScore);
            const userIds = ranking.map(item => item.userId);
            
            if (userIds.length === 0) {
                rankingList.innerHTML = '<div class="card"><div class="card-content">Nenhum resultado disponível no ranking.</div></div>';
                return;
            }
            
            db.collection('users')
                .where(firebase.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 20))
                .get()
                .then(usersSnapshot => {
                    const usersMap = {};
                    usersSnapshot.forEach(doc => {
                        usersMap[doc.id] = doc.data();
                    });
                    
                    rankingList.innerHTML = '';
                    
                    ranking.slice(0, 20).forEach((item, index) => {
                        const user = usersMap[item.userId];
                        if (!user) return;
                        
                        const rankingItem = document.createElement('div');
                        rankingItem.className = 'ranking-item';
                        
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
                                        <span class="btn-text">Ver Detalhes</span>
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

function loadReports() {
    loadBasicStats();
    loadCharts();
}

function loadBasicStats() {
    db.collection('users').get().then(snapshot => {
        document.getElementById('total-users').textContent = snapshot.size;
    });
    
    db.collection('quizzes').where('status', '==', 'active').get().then(snapshot => {
        document.getElementById('total-quizzes').textContent = snapshot.size;
    });
    
    db.collection('questions').get().then(snapshot => {
        document.getElementById('total-questions').textContent = snapshot.size;
    });
    
    db.collection('userQuizzes').where('status', '==', 'completed').get().then(snapshot => {
        document.getElementById('total-attempts').textContent = snapshot.size;
    });
}

function loadCharts() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    const exampleData = {
        labels: Array.from(availableCategories).slice(0, 5),
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

// Função de debug para verificar o estado do quiz
function debugQuizState() {
    console.log('=== DEBUG QUIZ STATE ===');
    console.log('currentQuiz:', currentQuiz);
    console.log('currentQuestions:', currentQuestions);
    console.log('currentQuestionIndex:', currentQuestionIndex);
    console.log('userAnswers:', userAnswers);
    console.log('userQuizId:', userQuizId);
    console.log('========================');
}
