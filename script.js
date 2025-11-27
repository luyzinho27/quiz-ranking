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

// Configurar persistência de sessão
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error('Erro ao configurar persistência:', error);
    });

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
let editingQuizId = null;
let editingQuestionId = null;
let editingUserId = null;
let exitCount = 0;
let quizStartTime = 0;

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
    initModals();
    
    // Verificar se há um usuário logado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado
            showLoading();
            getUserData(user.uid).then(userData => {
                // Verificar se o usuário está ativo
                if (userData.status === 'inactive' && userData.userType === 'aluno') {
                    auth.signOut();
                    hideLoading();
                    alert('Sua conta foi desativada. Entre em contato com o administrador.');
                    return;
                }
                
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
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    // Alternar entre login e cadastro
    loginTab.addEventListener('click', () => {
        switchAuthTab('login');
    });
    
    registerTab.addEventListener('click', () => {
        switchAuthTab('register');
        checkAdminExists();
    });
    
    // Login com submit do formulário
    loginForm.addEventListener('submit', (e) => {
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
                // Verificar status do usuário
                return getUserData(userCredential.user.uid);
            })
            .then(userData => {
                if (userData.status === 'inactive' && userData.userType === 'aluno') {
                    auth.signOut();
                    hideLoading();
                    showError('login-error', 'Sua conta foi desativada. Entre em contato com o administrador.');
                    return;
                }
                
                // Login bem-sucedido
                document.getElementById('login-error').textContent = '';
                hideLoading();
            })
            .catch((error) => {
                hideLoading();
                showError('login-error', getAuthErrorMessage(error.code));
            });
    });
    
    // Cadastro com submit do formulário
    registerForm.addEventListener('submit', (e) => {
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
        
        // Verificar se já existe administrador
        if (userType === 'admin') {
            checkAdminExists().then(adminExists => {
                if (adminExists) {
                    showError('register-error', 'Já existe um administrador cadastrado. Não é possível criar outro.');
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
        const email = document.getElementById('login-email').value;
        if (!email) {
            alert('Por favor, insira seu e-mail para recuperar a senha.');
            return;
        }
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
            })
            .catch(error => {
                alert('Erro ao enviar e-mail de recuperação: ' + getAuthErrorMessage(error.code));
            });
    });
    
    // Toggle password visibility
    document.getElementById('toggle-login-password').addEventListener('click', function() {
        togglePasswordVisibility('login-password', this);
    });
    
    document.getElementById('toggle-register-password').addEventListener('click', function() {
        togglePasswordVisibility('register-password', this);
    });

    // Permitir Enter para navegar entre campos
    document.getElementById('login-email').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('login-password').focus();
        }
    });

    document.getElementById('login-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('login-btn').click();
        }
    });

    // Para o formulário de cadastro
    const registerFields = ['register-name', 'register-email', 'register-password'];
    registerFields.forEach((fieldId, index) => {
        document.getElementById(fieldId).addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (index < registerFields.length - 1) {
                    document.getElementById(registerFields[index + 1]).focus();
                } else {
                    document.getElementById('register-btn').click();
                }
            }
        });
    });
}

// Alternar visibilidade da senha
function togglePasswordVisibility(passwordFieldId, toggleIcon) {
    const passwordField = document.getElementById(passwordFieldId);
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
    
    // Alterar ícone
    toggleIcon.classList.toggle('fa-eye');
    toggleIcon.classList.toggle('fa-eye-slash');
}

// Verificar se já existe administrador
function checkAdminExists() {
    return db.collection('users')
        .where('userType', '==', 'admin')
        .get()
        .then(querySnapshot => {
            const adminOption = document.getElementById('admin-option');
            if (!querySnapshot.empty) {
                // Já existe administrador, desabilitar opção
                adminOption.disabled = true;
                adminOption.textContent = 'Administrador (Já existe)';
                return true;
            } else {
                // Não existe administrador, habilitar opção
                adminOption.disabled = false;
                adminOption.textContent = 'Administrador';
                return false;
            }
        })
        .catch(error => {
            console.error('Erro ao verificar administradores:', error);
            return false;
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
                status: 'active',
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
    
    // Controles do quiz
    initQuizControls();
    
    // Navegação dos resultados
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        showDashboard();
    });
    
    document.getElementById('new-quiz').addEventListener('click', () => {
        showDashboard();
        setTimeout(() => {
            if (currentUser.userType === 'aluno') {
                switchTab('quizzes-tab', 'quizzes-section');
                loadQuizzes();
            }
        }, 100);
    });
    
    document.getElementById('review-quiz').addEventListener('click', showReviewModal);
    
    // Botões do admin
    document.getElementById('create-quiz-btn').addEventListener('click', () => openQuizModal());
    document.getElementById('create-question-btn').addEventListener('click', () => openQuestionModal());
    document.getElementById('import-questions-btn').addEventListener('click', openImportModal);
    
    // Inicializar página sobre se existir
    if (document.getElementById('about-section')) {
        initAboutPage();
    }
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
    
    document.getElementById('about-tab').addEventListener('click', () => {
        switchTab('about-tab', 'about-section');
    });
    
    // Abas do admin
    document.getElementById('admin-quizzes-tab').addEventListener('click', () => {
        switchAdminTab('admin-quizzes-tab', 'admin-quizzes-section');
        loadAdminQuizzes();
    });
    
    document.getElementById('admin-questions-tab').addEventListener('click', () => {
        switchAdminTab('admin-questions-tab', 'admin-questions-section');
        loadAdminQuestions();
    });
    
    document.getElementById('admin-users-tab').addEventListener('click', () => {
        switchAdminTab('admin-users-tab', 'admin-users-section');
        loadAdminUsers();
    });
    
    document.getElementById('admin-reports-tab').addEventListener('click', () => {
        switchAdminTab('admin-reports-tab', 'admin-reports-section');
        loadAdminReports();
    });
    
    document.getElementById('admin-about-tab').addEventListener('click', () => {
        switchAdminTab('admin-about-tab', 'admin-about-section');
    });
    
    // Botão de sair do quiz
    document.getElementById('exit-quiz-btn').addEventListener('click', confirmExitQuiz);
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
    
    // CORREÇÃO: Adicionar event listener corretamente para o botão "Finalizar Quiz"
    document.getElementById('finish-quiz').addEventListener('click', () => {
        finishQuiz();
    });
    
    // Seleção de opções
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            const selectedValue = this.getAttribute('data-value');
            selectOption(selectedValue);
        });
    });
}

// Inicializar modals
function initModals() {
    // Modal do quiz
    document.getElementById('close-quiz-modal').addEventListener('click', closeQuizModal);
    document.getElementById('cancel-quiz').addEventListener('click', closeQuizModal);
    document.getElementById('save-quiz').addEventListener('click', saveQuiz);
    
    // Modal da questão
    document.getElementById('close-question-modal').addEventListener('click', closeQuestionModal);
    document.getElementById('cancel-question').addEventListener('click', closeQuestionModal);
    document.getElementById('save-question').addEventListener('click', saveQuestion);
    
    // Modal do usuário
    document.getElementById('close-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('cancel-user').addEventListener('click', closeUserModal);
    document.getElementById('save-user').addEventListener('click', saveUser);
    
    // Modal de importação
    document.getElementById('close-import-modal').addEventListener('click', closeImportModal);
    document.getElementById('cancel-import').addEventListener('click', closeImportModal);
    document.getElementById('import-questions').addEventListener('click', importQuestions);
    
    // Modal de revisão
    document.getElementById('close-review-modal').addEventListener('click', closeReviewModal);
    document.getElementById('close-review').addEventListener('click', closeReviewModal);
    
    // Toggle password para o modal de usuário
    document.getElementById('toggle-user-password').addEventListener('click', function() {
        togglePasswordVisibility('user-password', this);
    });
    
    // Fechar modals ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

// Inicializar página sobre
function initAboutPage() {
    // Adicionar event listener para o botão de reportar bug
    const reportBugBtn = document.getElementById('report-bug');
    if (reportBugBtn) {
        reportBugBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openBugReportModal();
        });
    }
}

// Função para abrir modal de reportar bug
function openBugReportModal() {
    const email = 'luizynho27@email.com';
    const subject = 'Reportar Bug - QuizMaster';
    const body = `Olá,\n\nEncontrei um bug no QuizMaster:\n\n• Descrição do problema:\n• Passos para reproduzir:\n• Comportamento esperado:\n• Comportamento atual:\n\nInformações do sistema:\n- Navegador: ${navigator.userAgent}\n- Resolução: ${screen.width}x${screen.height}\n\nObrigado!`;
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}

// Alternar entre abas do aluno
function switchTab(tabId, sectionId) {
    // Remover classe active de todas as abas e seções
    const tabs = document.querySelectorAll('#student-dashboard .dashboard-header .tab');
    const sections = document.querySelectorAll('#student-dashboard .dashboard-content .section');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    // Adicionar classe active à aba e seção selecionadas
    document.getElementById(tabId).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

// Alternar entre abas do admin
function switchAdminTab(tabId, sectionId) {
    // Remover classe active de todas as abas e seções
    const tabs = document.querySelectorAll('#admin-dashboard .dashboard-header .tab');
    const sections = document.querySelectorAll('#admin-dashboard .dashboard-content .section');
    
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
        loadAdminQuizzes();
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

// ===============================
// GERENCIAMENTO DE QUIZZES
// ===============================

// Carregar quizzes para alunos
function loadQuizzes() {
    const quizzesList = document.getElementById('quizzes-list');
    quizzesList.innerHTML = '<div class="card"><div class="card-content">Carregando quizzes...</div></div>';
    
    // Buscar quizzes ativos
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

// ===============================
// QUIZ - EXECUÇÃO
// ===============================

// Iniciar quiz
function startQuiz(quiz) {
    currentQuiz = quiz;
    userAnswers = new Array(quiz.questionsCount).fill(null);
    currentQuestionIndex = 0;
    exitCount = 0;
    
    // Verificar se já existe um quiz em andamento
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', '==', 'in-progress')
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                // Continuar quiz existente
                const userQuizDoc = querySnapshot.docs[0];
                userQuizId = userQuizDoc.id;
                const userQuiz = userQuizDoc.data();
                
                userAnswers = userQuiz.answers || new Array(quiz.questionsCount).fill(null);
                currentQuestionIndex = userQuiz.currentQuestionIndex || 0;
                exitCount = userQuiz.exitCount || 0;
                timeRemaining = userQuiz.timeRemaining || (quiz.time * 60);
                
                // Buscar questões do quiz
                loadQuizQuestions(quiz.id);
            } else {
                // Criar novo registro do quiz do usuário
                timeRemaining = quiz.time * 60;
                
                db.collection('userQuizzes').add({
                    userId: currentUser.uid,
                    quizId: quiz.id,
                    status: 'in-progress',
                    answers: userAnswers,
                    currentQuestionIndex: 0,
                    timeRemaining: timeRemaining,
                    exitCount: 0,
                    startTime: firebase.firestore.FieldValue.serverTimestamp(),
                    attempts: 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then((docRef) => {
                    userQuizId = docRef.id;
                    // Buscar questões do quiz
                    loadQuizQuestions(quiz.id);
                });
            }
        })
        .catch(error => {
            alert('Erro ao iniciar quiz: ' + error.message);
        });
}

// Carregar questões do quiz
function loadQuizQuestions(quizId) {
    showLoading();
    
    // Buscar questões baseado na categoria do quiz
    let questionsQuery = db.collection('questions');
    
    // Se o quiz tem uma categoria específica, filtrar por ela
    if (currentQuiz.category && currentQuiz.category.trim() !== '') {
        questionsQuery = questionsQuery.where('category', '==', currentQuiz.category);
    }
    
    questionsQuery.get()
        .then(querySnapshot => {
            hideLoading();
            
            if (querySnapshot.empty) {
                alert('Nenhuma questão disponível para este quiz. Tente selecionar outra categoria.');
                return;
            }
            
            const allQuestions = [];
            querySnapshot.forEach(doc => {
                const question = { id: doc.id, ...doc.data() };
                // Garantir que a questão tem o campo 'text' (enunciado)
                if (question.text) {
                    allQuestions.push(question);
                }
            });
            
            // Selecionar questões aleatórias
            const questionCount = Math.min(currentQuiz.questionsCount, allQuestions.length);
            
            // Embaralhar questões usando Fisher-Yates
            const shuffledQuestions = [...allQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            
            // Selecionar as primeiras N questões
            currentQuestions = shuffledQuestions.slice(0, questionCount);
            
            // Garantir que userAnswers tenha o tamanho correto
            userAnswers = new Array(currentQuestions.length).fill(null);
            
            // Iniciar quiz
            showQuiz();
        })
        .catch(error => {
            hideLoading();
            console.error('Erro detalhado ao carregar questões:', error);
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
    totalTime = currentQuiz.time * 60;
    startTimer();
    
    // Exibir primeira questão
    displayQuestion();
}

// Iniciar timer do quiz
function startTimer() {
    updateTimerDisplay();
    quizStartTime = Date.now();
    
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

// Função auxiliar para atualizar progresso do quiz
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

// Função auxiliar para atualizar botões de navegação
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const finishButton = document.getElementById('finish-quiz');
    
    if (prevButton) prevButton.disabled = currentQuestionIndex === 0;
    if (nextButton) nextButton.style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'none' : 'flex';
    if (finishButton) finishButton.classList.toggle('hidden', currentQuestionIndex !== currentQuestions.length - 1);
}

// Exibir questão atual
function displayQuestion() {
    if (!currentQuestions || currentQuestions.length === 0 || currentQuestionIndex >= currentQuestions.length) {
        console.error('Nenhuma questão disponível para exibir ou índice inválido');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    // Exibir o enunciado da questão (campo 'text')
    const questionTextElement = document.getElementById('question-text');
    const optionATextElement = document.getElementById('option-a-text');
    const optionBTextElement = document.getElementById('option-b-text');
    const optionCTextElement = document.getElementById('option-c-text');
    const optionDTextElement = document.getElementById('option-d-text');
    
    if (questionTextElement) {
        questionTextElement.textContent = question.text || 'Questão sem texto definido';
    }
    
    if (optionATextElement) {
        optionATextElement.textContent = question.options?.a || 'Opção A não definida';
    }
    
    if (optionBTextElement) {
        optionBTextElement.textContent = question.options?.b || 'Opção B não definida';
    }
    
    if (optionCTextElement) {
        optionCTextElement.textContent = question.options?.c || 'Opção C não definida';
    }
    
    if (optionDTextElement) {
        optionDTextElement.textContent = question.options?.d || 'Opção D não definida';
    }
    
    // Atualizar progresso
    updateQuizProgress();
    
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
    updateNavigationButtons();
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
    if (!userQuizId) return;
    
    db.collection('userQuizzes').doc(userQuizId).update({
        answers: userAnswers,
        currentQuestionIndex: currentQuestionIndex,
        timeRemaining: timeRemaining,
        exitCount: exitCount,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .catch(error => {
        console.error('Erro ao atualizar progresso do quiz:', error);
    });
}

// Confirmar saída do quiz - MODIFICADO
function confirmExitQuiz() {
    if (exitCount >= 1) {
        // Segunda saída - finalizar quiz automaticamente e voltar para aba de Quizzes
        if (confirm('Esta é sua segunda saída do quiz. O quiz será finalizado automaticamente com as questões respondidas até agora. Deseja continuar?')) {
            finishQuiz(true); // Forçar finalização
            // Após finalizar, voltar para a aba de Quizzes
            setTimeout(() => {
                showDashboard();
                if (currentUser.userType === 'aluno') {
                    switchTab('quizzes-tab', 'quizzes-section');
                    loadQuizzes();
                }
            }, 100);
        }
    } else {
        // Primeira saída
        if (confirm('Tem certeza que deseja sair do quiz? Seu progresso será salvo e você poderá continuar depois.')) {
            exitCount++;
            clearInterval(quizTimer);
            
            // Atualizar contador de saídas
            db.collection('userQuizzes').doc(userQuizId).update({
                exitCount: exitCount,
                timeRemaining: timeRemaining,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                showDashboard();
            });
        }
    }
}

// CORREÇÃO: Função finishQuiz completamente reescrita
function finishQuiz(forced = false) {
    console.log('Finalizando quiz...', { forced, userQuizId, currentQuestions, userAnswers });
    
    // Parar o timer
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    // Calcular pontuação
    let score = 0;
    let answeredQuestions = 0;
    
    if (currentQuestions && userAnswers) {
        currentQuestions.forEach((question, index) => {
            if (userAnswers[index]) {
                answeredQuestions++;
                if (userAnswers[index] === question.correctAnswer) {
                    score++;
                }
            }
        });
    }
    
    const timeTaken = totalTime - timeRemaining;
    const percentage = forced ? 
        (answeredQuestions > 0 ? (score / answeredQuestions) * 100 : 0) : 
        (currentQuestions.length > 0 ? (score / currentQuestions.length) * 100 : 0);
    
    console.log('Resultado calculado:', { score, answeredQuestions, percentage, timeTaken });
    
    // Se não temos userQuizId, mostrar resultado diretamente
    if (!userQuizId) {
        console.warn('userQuizId não encontrado, mostrando resultado diretamente');
        showQuizResult(currentQuiz.id, score, percentage, timeTaken, forced);
        return;
    }
    
    // Atualizar status do quiz do usuário
    db.collection('userQuizzes').doc(userQuizId).update({
        status: 'completed',
        score: score,
        percentage: percentage,
        timeTaken: timeTaken,
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        forcedCompletion: forced || false
    })
    .then(() => {
        console.log('Quiz finalizado com sucesso no Firestore');
        // Mostrar resultado
        showQuizResult(currentQuiz.id, score, percentage, timeTaken, forced);
    })
    .catch(error => {
        console.error('Erro ao finalizar quiz no Firestore:', error);
        // Mostrar resultado mesmo com erro
        showQuizResult(currentQuiz.id, score, percentage, timeTaken, forced);
    });
}

// Mostrar resultado do quiz
function showQuizResult(quizId, score = null, percentage = null, timeTaken = null, forced = false) {
    console.log('Mostrando resultado:', { quizId, score, percentage, timeTaken, forced });
    
    if (score !== null && percentage !== null && timeTaken !== null) {
        // Exibir resultado recém-calculado
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('score-percentage').textContent = `${percentage.toFixed(1)}%`;
        
        // CORREÇÃO: Calcular answeredQuestions corretamente
        let answeredQuestions = 0;
        if (userAnswers) {
            answeredQuestions = userAnswers.filter(answer => answer !== null).length;
        }
        
        if (forced) {
            document.getElementById('score-fraction').textContent = `${score}/${currentQuestions.length} (${answeredQuestions} respondidas)`;
            document.getElementById('result-subtitle').textContent = 'Quiz finalizado - Algumas questões não foram respondidas';
        } else {
            document.getElementById('score-fraction').textContent = `${score}/${currentQuestions.length}`;
            document.getElementById('result-subtitle').textContent = 'Veja como você foi';
        }
        
        document.getElementById('correct-answers').textContent = score;
        document.getElementById('wrong-answers').textContent = forced ? 
            (answeredQuestions - score) : 
            (currentQuestions.length - score);
        document.getElementById('time-taken').textContent = timeText;
        
        // Animar o círculo de progresso
        const circleProgress = document.getElementById('circle-progress');
        const degrees = (percentage / 100) * 360;
        if (circleProgress) {
            circleProgress.style.transform = `rotate(${degrees}deg)`;
                    }

        // Calcular posição no ranking
        calculateRankingPosition(quizId, percentage);
        
        quizContainer.classList.add('hidden');
        quizResult.classList.remove('hidden');
    } else {
        // Buscar resultado salvo
        db.collection('userQuizzes')
            .where('userId', '==', currentUser.uid)
            .where('quizId', '==', quizId)
            .where('status', '==', 'completed')
            .get()
            .then(querySnapshot => {
                if (!querySnapshot.empty) {
                    const userQuiz = querySnapshot.docs[0].data();
                    const minutes = Math.floor(userQuiz.timeTaken / 60);
                    const seconds = userQuiz.timeTaken % 60;
                    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    document.getElementById('score-percentage').textContent = `${userQuiz.percentage.toFixed(1)}%`;
                    document.getElementById('score-fraction').textContent = `${userQuiz.score}/${currentQuestions.length}`;
                    document.getElementById('correct-answers').textContent = userQuiz.score;
                    document.getElementById('wrong-answers').textContent = currentQuestions.length - userQuiz.score;
                    document.getElementById('time-taken').textContent = timeText;
                    
                    // Animar o círculo de progresso
                    const circleProgress = document.getElementById('circle-progress');
                    const degrees = (userQuiz.percentage / 100) * 360;
                    if (circleProgress) {
                        circleProgress.style.transform = `rotate(${degrees}deg)`;
                    }
                    
                    // Calcular posição no ranking
                    calculateRankingPosition(quizId, userQuiz.percentage);
                    
                    quizContainer.classList.add('hidden');
                    quizResult.classList.remove('hidden');
                }
            })
            .catch(error => {
                console.error('Erro ao buscar resultado salvo:', error);
                // Em caso de erro, voltar para o dashboard
                showDashboard();
            });
    }
}

// Calcular posição no ranking
function calculateRankingPosition(quizId, percentage) {
    db.collection('userQuizzes')
        .where('quizId', '==', quizId)
        .where('status', '==', 'completed')
        .get()
        .then(querySnapshot => {
            const rankings = [];
            querySnapshot.forEach(doc => {
                const userQuiz = doc.data();
                rankings.push({
                    userId: userQuiz.userId,
                    percentage: userQuiz.percentage
                });
            });
            
            // Ordenar por porcentagem (decrescente)
            rankings.sort((a, b) => b.percentage - a.percentage);
            
            // Encontrar posição do usuário atual
            const userPosition = rankings.findIndex(ranking => ranking.userId === currentUser.uid) + 1;
            const totalPlayers = rankings.length;
            
            document.getElementById('ranking-position').textContent = userPosition > 0 ? 
                `${userPosition}º de ${totalPlayers}` : '-';
        })
        .catch(error => {
            console.error('Erro ao calcular ranking:', error);
            document.getElementById('ranking-position').textContent = '-';
        });
}

// Mostrar modal de revisão
function showReviewModal() {
    const reviewContent = document.getElementById('review-content');
    reviewContent.innerHTML = '';
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correctAnswer;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
        reviewItem.innerHTML = `
            <div class="review-question">
                <h4>Questão ${index + 1}</h4>
                <p>${question.text}</p>
            </div>
            <div class="review-answers">
                <div class="review-answer ${userAnswer === 'a' ? 'user-answer' : ''} ${question.correctAnswer === 'a' ? 'correct-answer' : ''}">
                    <strong>A:</strong> ${question.options.a}
                </div>
                <div class="review-answer ${userAnswer === 'b' ? 'user-answer' : ''} ${question.correctAnswer === 'b' ? 'correct-answer' : ''}">
                    <strong>B:</strong> ${question.options.b}
                </div>
                <div class="review-answer ${userAnswer === 'c' ? 'user-answer' : ''} ${question.correctAnswer === 'c' ? 'correct-answer' : ''}">
                    <strong>C:</strong> ${question.options.c}
                </div>
                <div class="review-answer ${userAnswer === 'd' ? 'user-answer' : ''} ${question.correctAnswer === 'd' ? 'correct-answer' : ''}">
                    <strong>D:</strong> ${question.options.d}
                </div>
            </div>
            <div class="review-result">
                <strong>Sua resposta:</strong> ${userAnswer ? userAnswer.toUpperCase() : 'Não respondida'} 
                ${isCorrect ? '✓ Correto' : '✗ Incorreto'}
                ${!isCorrect ? `<br><strong>Resposta correta:</strong> ${question.correctAnswer.toUpperCase()}` : ''}
            </div>
        `;
        
        reviewContent.appendChild(reviewItem);
    });
    
    document.getElementById('review-modal').classList.remove('hidden');
}

// Fechar modal de revisão
function closeReviewModal() {
    document.getElementById('review-modal').classList.add('hidden');
}

// ===============================
// HISTÓRICO - CORRIGIDO
// ===============================

// Carregar histórico do usuário - VERSÃO CORRIGIDA
function loadUserHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="card"><div class="card-content">Carregando histórico...</div></div>';
    
    console.log('🔍 Iniciando carregamento do histórico...');
    
    // CONSULTA CORRIGIDA: Removendo a ordenação por completedAt que causava o erro
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'completed')
        .get()
        .then(querySnapshot => {
            console.log('✅ Consulta bem-sucedida. Documentos encontrados:', querySnapshot.size);
            
            historyList.innerHTML = '';
            
            if (querySnapshot.empty) {
                console.log('ℹ️ Nenhum quiz concluído encontrado');
                historyList.innerHTML = `
                    <div class="card">
                        <div class="card-content">
                            <div style="text-align: center; padding: 2rem;">
                                <i class="fas fa-inbox" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
                                <h3>Nenhum quiz concluído ainda</h3>
                                <p>Complete alguns quizzes para ver seu histórico aqui!</p>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }
            
            const userQuizzes = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                console.log('📄 Documento:', doc.id, data);
                
                userQuizzes.push({
                    id: doc.id,
                    quizId: data.quizId,
                    score: data.score || 0,
                    percentage: data.percentage || 0,
                    timeTaken: data.timeTaken || 0,
                    answers: data.answers || [],
                    completedAt: data.completedAt || data.updatedAt || data.startTime,
                    attempts: data.attempts || 1
                });
            });
            
            // Ordenar localmente por data (mais recente primeiro)
            userQuizzes.sort((a, b) => {
                const dateA = a.completedAt ? (a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt)) : new Date(0);
                const dateB = b.completedAt ? (b.completedAt.toDate ? b.completedAt.toDate() : new Date(b.completedAt)) : new Date(0);
                return dateB - dateA;
            });
            
            console.log('🔄 Buscando informações dos quizzes...');
            
            // Buscar todos os quizzes de uma vez
            db.collection('quizzes').get()
                .then(quizzesSnapshot => {
                    const quizzesMap = {};
                    quizzesSnapshot.forEach(doc => {
                        quizzesMap[doc.id] = {
                            id: doc.id,
                            title: doc.data().title || 'Quiz sem título',
                            description: doc.data().description || 'Sem descrição',
                            questionsCount: doc.data().questionsCount || 0,
                            category: doc.data().category || 'Geral',
                            time: doc.data().time || 0
                        };
                    });
                    
                    console.log('🎯 Quizzes disponíveis no sistema:', Object.keys(quizzesMap));
                    
                    // Criar cards de histórico
                    let cardsCriados = 0;
                    userQuizzes.forEach(userQuiz => {
                        const quiz = quizzesMap[userQuiz.quizId];
                        
                        if (quiz) {
                            cardsCriados++;
                            createHistoryCard(historyList, userQuiz, quiz);
                        } else {
                            console.log('❌ Quiz não encontrado:', userQuiz.quizId);
                            // Criar card mesmo sem informações do quiz
                            createFallbackHistoryCard(historyList, userQuiz);
                        }
                    });
                    
                    // Se nenhum card foi criado, mostrar mensagem
                    if (cardsCriados === 0 && userQuizzes.length > 0) {
                        userQuizzes.forEach(userQuiz => {
                            createFallbackHistoryCard(historyList, userQuiz);
                        });
                    }
                    
                    // Adicionar gráfico de desempenho se houver dados
                    if (userQuizzes.length > 0) {
                        createPerformanceChart(historyList, userQuizzes, quizzesMap);
                    }
                    
                })
                .catch(error => {
                    console.error('❌ Erro ao buscar quizzes:', error);
                    // Criar cards com informações básicas mesmo sem os dados do quiz
                    userQuizzes.forEach(userQuiz => {
                        createFallbackHistoryCard(historyList, userQuiz);
                    });
                });
        })
        .catch(error => {
            console.error('❌ Erro geral ao carregar histórico:', error);
            historyList.innerHTML = `
                <div class="card">
                    <div class="card-content">
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            Erro ao carregar histórico. Tente novamente.
                        </div>
                    </div>
                </div>
            `;
        });
}

// Criar card de histórico individual
function createHistoryCard(container, userQuiz, quiz) {
    const historyCard = document.createElement('div');
    historyCard.className = 'card';
    
    // Determinar cor do badge baseado na performance
    let badgeClass = 'card-badge';
    let badgeText = `${userQuiz.percentage.toFixed(1)}%`;
    let performanceText = '';
    
    if (userQuiz.percentage >= 80) {
        badgeClass += ' success';
        performanceText = 'Excelente!';
    } else if (userQuiz.percentage >= 60) {
        badgeClass += ' warning';
        performanceText = 'Bom!';
    } else {
        badgeClass += ' danger';
        performanceText = 'Precisa melhorar';
    }
    
    // Calcular tempo
    const minutes = Math.floor(userQuiz.timeTaken / 60);
    const seconds = userQuiz.timeTaken % 60;
    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Formatar data
    let dateText = 'Data não disponível';
    if (userQuiz.completedAt) {
        try {
            const date = userQuiz.completedAt.toDate ? userQuiz.completedAt.toDate() : new Date(userQuiz.completedAt);
            dateText = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        } catch (e) {
            console.log('Erro ao formatar data:', e);
            dateText = 'Data inválida';
        }
    }
    
    historyCard.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${quiz.title}</h3>
            <div>
                <span class="${badgeClass}">${badgeText}</span>
                <span class="card-badge card-badge-secondary">${performanceText}</span>
            </div>
        </div>
        <div class="card-content">
            <p>${quiz.description}</p>
            <div class="history-details">
                <div class="detail">
                    <strong><i class="fas fa-check-circle" style="color: #28a745;"></i> Pontuação:</strong> 
                    ${userQuiz.score}/${quiz.questionsCount}
                </div>
                <div class="detail">
                    <strong><i class="fas fa-clock" style="color: #6c757d;"></i> Tempo:</strong> ${timeText}
                </div>
                <div class="detail">
                    <strong><i class="fas fa-calendar" style="color: #17a2b8;"></i> Concluído em:</strong> ${dateText}
                </div>
                <div class="detail">
                    <strong><i class="fas fa-layer-group" style="color: #6f42c1;"></i> Categoria:</strong> ${quiz.category}
                </div>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary view-details" data-quiz-id="${quiz.id}">
                <i class="fas fa-chart-bar"></i>
                <span class="btn-text">Ver Detalhes</span>
            </button>
            <button class="btn btn-secondary review-answers" data-user-quiz-id="${userQuiz.id}" data-quiz-id="${quiz.id}">
                <i class="fas fa-redo"></i>
                <span class="btn-text">Revisar</span>
            </button>
        </div>
    `;
    
    // Event listeners
    historyCard.querySelector('.view-details').addEventListener('click', function() {
        const quizId = this.getAttribute('data-quiz-id');
        showQuizResult(quizId);
    });
    
    historyCard.querySelector('.review-answers').addEventListener('click', function() {
        const userQuizId = this.getAttribute('data-user-quiz-id');
        const quizId = this.getAttribute('data-quiz-id');
        loadReviewData(userQuizId, quizId);
    });
    
    container.appendChild(historyCard);
}

// Criar card de fallback quando o quiz não for encontrado
function createFallbackHistoryCard(container, userQuiz) {
    const historyCard = document.createElement('div');
    historyCard.className = 'card';
    
    let badgeClass = 'card-badge';
    let badgeText = `${userQuiz.percentage.toFixed(1)}%`;
    
    if (userQuiz.percentage >= 80) {
        badgeClass += ' success';
    } else if (userQuiz.percentage >= 60) {
        badgeClass += ' warning';
    } else {
        badgeClass += ' danger';
    }
    
    const minutes = Math.floor(userQuiz.timeTaken / 60);
    const seconds = userQuiz.timeTaken % 60;
    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    let dateText = 'Data não disponível';
    if (userQuiz.completedAt) {
        try {
            const date = userQuiz.completedAt.toDate ? userQuiz.completedAt.toDate() : new Date(userQuiz.completedAt);
            dateText = date.toLocaleDateString('pt-BR');
        } catch (e) {
            dateText = 'Data inválida';
        }
    }
    
    historyCard.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">Quiz Concluído</h3>
            <div>
                <span class="${badgeClass}">${badgeText}</span>
                <span class="card-badge card-badge-secondary">Informações Limitadas</span>
            </div>
        </div>
        <div class="card-content">
            <p>As informações completas deste quiz não estão disponíveis no momento.</p>
            <div class="history-details">
                <div class="detail">
                    <strong><i class="fas fa-check-circle" style="color: #28a745;"></i> Pontuação:</strong> 
                    ${userQuiz.score} pontos
                </div>
                <div class="detail">
                    <strong><i class="fas fa-clock" style="color: #6c757d;"></i> Temo:</strong> ${timeText}
                </div>
                <div class="detail">
                    <strong><i class="fas fa-calendar" style="color: #17a2b8;"></i> Concluído em:</strong> ${dateText}
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(historyCard);
}

// Criar gráfico de desempenho
function createPerformanceChart(container, userQuizzes, quizzesMap) {
    const chartCard = document.createElement('div');
    chartCard.className = 'card';
    chartCard.innerHTML = `
        <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-line"></i> Meu Desempenho</h3>
        </div>
        <div class="card-content">
            <div class="chart-container">
                <canvas id="historyPerformanceChart" width="400" height="200"></canvas>
            </div>
            <div class="stats-grid" style="margin-top: 1.5rem;">
                <div class="stat-item">
                    <div class="stat-value">${userQuizzes.length}</div>
                    <div class="stat-label">Quizzes Concluídos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${calculateAverage(userQuizzes, 'percentage').toFixed(1)}%</div>
                    <div class="stat-label">Pontuação Média</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${findBestPerformance(userQuizzes).toFixed(1)}%</div>
                    <div class="stat-label">Melhor Pontuação</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${calculateTotalTime(userQuizzes)}</div>
                    <div class="stat-label">Tempo Total</div>
                </div>
            </div>
        </div>
    `;
    
    container.insertBefore(chartCard, container.firstChild);
    
    // Inicializar gráfico após o DOM ser atualizado
    setTimeout(() => {
        initializeHistoryChart(userQuizzes, quizzesMap);
    }, 100);
}

// Inicializar gráfico do histórico
function initializeHistoryChart(userQuizzes, quizzesMap) {
    const ctx = document.getElementById('historyPerformanceChart');
    if (!ctx) return;
    
    const labels = userQuizzes.map((quiz, index) => {
        const quizInfo = quizzesMap[quiz.quizId];
        return quizInfo ? quizInfo.title.substring(0, 20) + (quizInfo.title.length > 20 ? '...' : '') : `Quiz ${index + 1}`;
    });
    
    const percentages = userQuizzes.map(quiz => quiz.percentage);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Desempenho (%)',
                data: percentages,
                borderColor: '#4a6cf7',
                backgroundColor: 'rgba(74, 108, 247, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolução do Desempenho',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentagem (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Quizzes Realizados'
                    }
                }
            }
        }
    });
}

// Funções auxiliares para cálculos
function calculateAverage(array, field) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / array.length;
}

function findBestPerformance(userQuizzes) {
    if (userQuizzes.length === 0) return 0;
    return Math.max(...userQuizzes.map(quiz => quiz.percentage));
}

function calculateTotalTime(userQuizzes) {
    const totalSeconds = userQuizzes.reduce((acc, quiz) => acc + (quiz.timeTaken || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Carregar dados para revisão
function loadReviewData(userQuizId, quizId) {
    console.log('🔄 Carregando dados para revisão...');
    showLoading();
    
    Promise.all([
        db.collection('userQuizzes').doc(userQuizId).get(),
        db.collection('quizzes').doc(quizId).get()
    ]).then(([userQuizDoc, quizDoc]) => {
        if (!userQuizDoc.exists || !quizDoc.exists) {
            hideLoading();
            alert('Dados não encontrados para revisão.');
            return;
        }
        
        const userQuiz = userQuizDoc.data();
        const quiz = quizDoc.data();
        
        // Buscar questões
        db.collection('questions').get().then(questionsSnapshot => {
            hideLoading();
            
            const allQuestions = [];
            questionsSnapshot.forEach(doc => {
                allQuestions.push({ id: doc.id, ...doc.data() });
            });
            
            // Selecionar questões aleatórias (simulando o quiz original)
            const shuffledQuestions = [...allQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            
            currentQuestions = shuffledQuestions.slice(0, quiz.questionsCount || 10);
            userAnswers = userQuiz.answers || [];
            
            showReviewModal();
            
        }).catch(error => {
            hideLoading();
            console.error('Erro ao buscar questões:', error);
            alert('Erro ao carregar questões para revisão.');
        });
        
    }).catch(error => {
        hideLoading();
        console.error('Erro ao carregar dados para revisão:', error);
        alert('Erro ao carregar dados para revisão.');
    });
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
                        
                        const avgScore = item.totalQuizzes > 0 ? (item.totalScore / item.totalQuizzes).toFixed(1) : 0;
                        
                        rankingItem.innerHTML = `
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${user.name} ${item.userId === currentUser.uid ? '(Você)' : ''}</div>
                                <div class="ranking-details">${item.totalQuizzes} quiz(s) • Média: ${avgScore} pts</div>
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

// ===============================
// FUNÇÕES DO ADMINISTRADOR
// ===============================

// Carregar categorias das questões
function loadQuestionCategories() {
    return db.collection('questions')
        .get()
        .then(querySnapshot => {
            const categories = new Set(['Geral']);
            querySnapshot.forEach(doc => {
                const question = doc.data();
                if (question.category && question.category.trim() !== '') {
                    categories.add(question.category);
                }
            });
            return Array.from(categories).sort();
        });
}

// Carregar quizzes para administrador
function loadAdminQuizzes() {
    const quizzesList = document.getElementById('admin-quizzes-list');
    quizzesList.innerHTML = '<div class="card"><div class="card-content">Carregando quizzes...</div></div>';
    
    // Buscar todos os quizzes
    db.collection('quizzes')
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            quizzesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<div class="card"><div class="card-content">Nenhum quiz criado ainda.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const quiz = { id: doc.id, ...doc.data() };
                const quizCard = createAdminQuizCard(quiz);
                quizzesList.appendChild(quizCard);
            });
        })
        .catch(error => {
            quizzesList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar quizzes.</div></div>';
            console.error('Erro ao carregar quizzes:', error);
        });
}

// Criar card de quiz para administrador
function createAdminQuizCard(quiz) {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${quiz.title}</h3>
            <span class="card-badge ${quiz.status === 'active' ? '' : 'card-badge-secondary'}">${quiz.status === 'active' ? 'Ativo' : 'Inativo'}</span>
        </div>
        <div class="card-content">
            <p>${quiz.description || 'Sem descrição'}</p>
            <p><strong>Categoria:</strong> ${quiz.category || 'Geral'}</p>
            <p><strong>Questões:</strong> ${quiz.questionsCount}</p>
            <p><strong>Tempo:</strong> ${quiz.time} minutos</p>
            <p><strong>Criado em:</strong> ${quiz.createdAt ? quiz.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</p>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary edit-quiz" data-quiz-id="${quiz.id}">
                <i class="fas fa-edit"></i>
                <span class="btn-text">Editar</span>
            </button>
            <button class="btn btn-secondary toggle-quiz" data-quiz-id="${quiz.id}" data-status="${quiz.status}">
                <i class="fas fa-power-off"></i>
                <span class="btn-text">${quiz.status === 'active' ? 'Desativar' : 'Ativar'}</span>
            </button>
            <button class="btn btn-danger delete-quiz" data-quiz-id="${quiz.id}">
                <i class="fas fa-trash"></i>
                <span class="btn-text">Excluir</span>
            </button>
        </div>
    `;
    
    // Adicionar event listeners aos botões
    card.querySelector('.edit-quiz').addEventListener('click', () => {
        openQuizModal(quiz.id);
    });
    
    card.querySelector('.toggle-quiz').addEventListener('click', () => {
        toggleQuizStatus(quiz.id, quiz.status === 'active' ? 'inactive' : 'active');
    });
    
    card.querySelector('.delete-quiz').addEventListener('click', () => {
        deleteQuiz(quiz.id);
    });
    
    return card;
}

// Abrir modal do quiz
function openQuizModal(quizId = null) {
    editingQuizId = quizId;
    const modal = document.getElementById('quiz-modal');
    const title = document.getElementById('quiz-modal-title');
    const categorySelect = document.getElementById('quiz-category');
    
    // Carregar categorias
    categorySelect.innerHTML = '<option value="">Carregando categorias...</option>';
    loadQuestionCategories().then(categories => {
        categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';
        categories.forEach(category => {
            categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
        });
        
        if (quizId) {
            // Modo edição
            title.textContent = 'Editar Quiz';
            
            // Carregar dados do quiz
            db.collection('quizzes').doc(quizId).get()
                .then(doc => {
                    if (doc.exists) {
                        const quiz = doc.data();
                        document.getElementById('quiz-title').value = quiz.title;
                        document.getElementById('quiz-description').value = quiz.description || '';
                        document.getElementById('quiz-category').value = quiz.category || '';
                        document.getElementById('quiz-questions-count').value = quiz.questionsCount;
                        document.getElementById('quiz-time').value = quiz.time;
                    }
                });
        } else {
            // Modo criação
            title.textContent = 'Criar Novo Quiz';
            // Limpar campos
            document.getElementById('quiz-title').value = '';
            document.getElementById('quiz-description').value = '';
            document.getElementById('quiz-category').value = '';
            document.getElementById('quiz-questions-count').value = '';
            document.getElementById('quiz-time').value = '';
        }
    });
    
    modal.classList.remove('hidden');
}

// Fechar modal do quiz
function closeQuizModal() {
    document.getElementById('quiz-modal').classList.add('hidden');
    editingQuizId = null;
}

// Salvar quiz
function saveQuiz() {
    const title = document.getElementById('quiz-title').value;
    const description = document.getElementById('quiz-description').value;
    const category = document.getElementById('quiz-category').value;
    const questionsCount = parseInt(document.getElementById('quiz-questions-count').value);
    const time = parseInt(document.getElementById('quiz-time').value);
    
    if (!title || !category || isNaN(questionsCount) || isNaN(time)) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    const quizData = {
        title: title,
        description: description,
        category: category,
        questionsCount: questionsCount,
        time: time,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingQuizId) {
        // Atualizar quiz existente
        db.collection('quizzes').doc(editingQuizId).update(quizData)
            .then(() => {
                alert('Quiz atualizado com sucesso!');
                closeQuizModal();
                loadAdminQuizzes();
            })
            .catch(error => {
                alert('Erro ao atualizar quiz: ' + error.message);
            });
    } else {
        // Criar novo quiz
        quizData.status = 'active';
        quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        db.collection('quizzes').add(quizData)
            .then(() => {
                alert('Quiz criado com sucesso!');
                closeQuizModal();
                loadAdminQuizzes();
            })
            .catch(error => {
                alert('Erro ao criar quiz: ' + error.message);
            });
    }
}

// Alternar status do quiz
function toggleQuizStatus(quizId, newStatus) {
    db.collection('quizzes').doc(quizId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Status do quiz atualizado com sucesso!');
        loadAdminQuizzes();
    })
    .catch(error => {
        alert('Erro ao atualizar status do quiz: ' + error.message);
    });
}

// Excluir quiz
function deleteQuiz(quizId) {
    if (confirm('Tem certeza que deseja excluir este quiz? Esta ação não pode ser desfeita.')) {
        db.collection('quizzes').doc(quizId).delete()
        .then(() => {
            alert('Quiz excluído com sucesso!');
            loadAdminQuizzes();
        })
        .catch(error => {
            alert('Erro ao excluir quiz: ' + error.message);
        });
    }
}

// Carregar questões para administrador
function loadAdminQuestions() {
    const questionsList = document.getElementById('admin-questions-list');
    questionsList.innerHTML = '<div class="card"><div class="card-content">Carregando questões...</div></div>';
    
    // Buscar todas as questões
    db.collection('questions')
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            questionsList.innerHTML = '';
            
            if (querySnapshot.empty) {
                questionsList.innerHTML = '<div class="card"><div class="card-content">Nenhuma questão criada ainda.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const question = { id: doc.id, ...doc.data() };
                const questionCard = createAdminQuestionCard(question);
                questionsList.appendChild(questionCard);
            });
        })
        .catch(error => {
            questionsList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar questões.</div></div>';
            console.error('Erro ao carregar questões:', error);
        });
}

// Criar card de questão para administrador
function createAdminQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'card question-card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${question.text.substring(0, 80)}${question.text.length > 80 ? '...' : ''}</h3>
            <div>
                <span class="card-badge">${question.category || 'Geral'}</span>
                <button class="btn btn-icon toggle-options">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        </div>
        <div class="question-options hidden">
            <div class="options-grid">
                <div class="option-item ${question.correctAnswer === 'a' ? 'correct-option' : ''}">
                    <strong>A:</strong> ${question.options?.a || 'N/A'}
                </div>
                <div class="option-item ${question.correctAnswer === 'b' ? 'correct-option' : ''}">
                    <strong>B:</strong> ${question.options?.b || 'N/A'}
                </div>
                <div class="option-item ${question.correctAnswer === 'c' ? 'correct-option' : ''}">
                    <strong>C:</strong> ${question.options?.c || 'N/A'}
                </div>
                <div class="option-item ${question.correctAnswer === 'd' ? 'correct-option' : ''}">
                    <strong>D:</strong> ${question.options?.d || 'N/A'}
                </div>
            </div>
            <p><strong>Resposta correta:</strong> <span class="correct-answer">${question.correctAnswer?.toUpperCase() || 'N/A'}</span></p>
            <p><strong>Criada em:</strong> ${question.createdAt ? question.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</p>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary edit-question" data-question-id="${question.id}">
                <i class="fas fa-edit"></i>
                <span class="btn-text">Editar</span>
            </button>
            <button class="btn btn-danger delete-question" data-question-id="${question.id}">
                <i class="fas fa-trash"></i>
                <span class="btn-text">Excluir</span>
            </button>
        </div>
    `;
    
    // Adicionar event listeners aos botões
    card.querySelector('.edit-question').addEventListener('click', () => {
        openQuestionModal(question.id);
    });
    
    card.querySelector('.delete-question').addEventListener('click', () => {
        deleteQuestion(question.id);
    });
    
    // Toggle para mostrar/recolher opções
    card.querySelector('.toggle-options').addEventListener('click', function() {
        const optionsContainer = card.querySelector('.question-options');
        const icon = this.querySelector('i');
        
        optionsContainer.classList.toggle('hidden');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });
    
    return card;
}

// Abrir modal da questão
function openQuestionModal(questionId = null) {
    editingQuestionId = questionId;
    const modal = document.getElementById('question-modal');
    const title = document.getElementById('question-modal-title');
    
    if (questionId) {
        // Modo edição
        title.textContent = 'Editar Questão';
        
        // Carregar dados da questão
        db.collection('questions').doc(questionId).get()
            .then(doc => {
                if (doc.exists) {
                    const question = doc.data();
                    document.getElementById('question-text').value = question.text;
                    document.getElementById('question-category').value = question.category || '';
                    document.getElementById('option-a').value = question.options?.a || '';
                    document.getElementById('option-b').value = question.options?.b || '';
                    document.getElementById('option-c').value = question.options?.c || '';
                    document.getElementById('option-d').value = question.options?.d || '';
                    document.getElementById('correct-answer').value = question.correctAnswer || 'a';
                }
            });
    } else {
        // Modo criação
        title.textContent = 'Adicionar Nova Questão';
        // Limpar campos
        document.getElementById('question-text').value = '';
        document.getElementById('question-category').value = '';
        document.getElementById('option-a').value = '';
        document.getElementById('option-b').value = '';
        document.getElementById('option-c').value = '';
        document.getElementById('option-d').value = '';
        document.getElementById('correct-answer').value = 'a';
    }
    
    modal.classList.remove('hidden');
}

// Fechar modal da questão
function closeQuestionModal() {
    document.getElementById('question-modal').classList.add('hidden');
    editingQuestionId = null;
}

// Salvar questão
function saveQuestion() {
    const text = document.getElementById('question-text').value;
    const category = document.getElementById('question-category').value;
    const optionA = document.getElementById('option-a').value;
    const optionB = document.getElementById('option-b').value;
    const optionC = document.getElementById('option-c').value;
    const optionD = document.getElementById('option-d').value;
    const correctAnswer = document.getElementById('correct-answer').value;
    
    if (!text || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    
    const questionData = {
        text: text,
        category: category || 'Geral',
        options: {
            a: optionA,
            b: optionB,
            c: optionC,
            d: optionD
        },
        correctAnswer: correctAnswer,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingQuestionId) {
        // Atualizar questão existente
        db.collection('questions').doc(editingQuestionId).update(questionData)
            .then(() => {
                alert('Questão atualizada com sucesso!');
                closeQuestionModal();
                loadAdminQuestions();
            })
            .catch(error => {
                alert('Erro ao atualizar questão: ' + error.message);
            });
    } else {
        // Criar nova questão
        questionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        db.collection('questions').add(questionData)
            .then(() => {
                alert('Questão criada com sucesso!');
                closeQuestionModal();
                loadAdminQuestions();
            })
            .catch(error => {
                alert('Erro ao criar questão: ' + error.message);
            });
    }
}

// Excluir questão
function deleteQuestion(questionId) {
    if (confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
        db.collection('questions').doc(questionId).delete()
        .then(() => {
            alert('Questão excluída com sucesso!');
            loadAdminQuestions();
        })
        .catch(error => {
            alert('Erro ao excluir questão: ' + error.message);
        });
    }
}

// Abrir modal de importação
function openImportModal() {
    document.getElementById('import-modal').classList.remove('hidden');
}

// Fechar modal de importação
function closeImportModal() {
    document.getElementById('import-modal').classList.add('hidden');
}

// Importar questões de JSON
function importQuestions() {
    const jsonData = document.getElementById('json-data').value;
    
    if (!jsonData) {
        alert('Por favor, cole o JSON com as questões.');
        return;
    }
    
    try {
        const questions = JSON.parse(jsonData);
        
        if (!Array.isArray(questions)) {
            alert('O JSON deve ser um array de questões.');
            return;
        }
        
        let importedCount = 0;
        let errorCount = 0;
        
        // Importar cada questão
        questions.forEach(question => {
            if (question.text && question.options && question.correctAnswer) {
                const questionData = {
                    text: question.text,
                    options: question.options,
                    correctAnswer: question.correctAnswer.toLowerCase(),
                    category: question.category || 'Geral',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                db.collection('questions').add(questionData)
                    .then(() => {
                        importedCount++;
                    })
                    .catch(error => {
                        errorCount++;
                        console.error('Erro ao importar questão:', error);
                    });
            } else {
                errorCount++;
            }
        });
        
        // Aguardar um pouco para processar todas as importações
        setTimeout(() => {
            alert(`Importação concluída!\nQuestões importadas: ${importedCount}\nErros: ${errorCount}`);
            closeImportModal();
            loadAdminQuestions();
        }, 2000);
        
    } catch (error) {
        alert('Erro ao processar JSON: ' + error.message);
    }
}

// Carregar usuários para administrador
function loadAdminUsers() {
    const usersList = document.getElementById('admin-users-list');
    usersList.innerHTML = '<div class="card"><div class="card-content">Carregando usuários...</div></div>';
    
    // Buscar todos os usuários
    db.collection('users')
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            usersList.innerHTML = '';
            
            if (querySnapshot.empty) {
                usersList.innerHTML = '<div class="card"><div class="card-content">Nenhum usuário cadastrado.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userCard = createAdminUserCard(user);
                usersList.appendChild(userCard);
            });
        })
        .catch(error => {
            usersList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar usuários.</div></div>';
            console.error('Erro ao carregar usuários:', error);
        });
}

// Criar card de usuário para administrador
function createAdminUserCard(user) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const statusBadge = user.status === 'active' ? 
        '<span class="card-badge success">Ativo</span>' : 
        '<span class="card-badge danger">Inativo</span>';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${user.name}</h3>
            <div>
                ${statusBadge}
                <span class="card-badge ${user.userType === 'admin' ? '' : 'card-badge-secondary'}">${user.userType === 'admin' ? 'Administrador' : 'Aluno'}</span>
            </div>
        </div>
        <div class="card-content">
            <p><strong>E-mail:</strong> ${user.email}</p>
            <p><strong>Tipo:</strong> ${user.userType}</p>
            <p><strong>Status:</strong> ${user.status === 'active' ? 'Ativo' : 'Inativo'}</p>
            <p><strong>Cadastrado em:</strong> ${user.createdAt ? user.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</p>
        </div>
        <div class="card-actions">
            <button class="btn btn-primary edit-user" data-user-id="${user.id}">
                <i class="fas fa-edit"></i>
                <span class="btn-text">Editar</span>
            </button>
            <button class="btn btn-secondary toggle-user" data-user-id="${user.id}" data-status="${user.status}">
                <i class="fas fa-power-off"></i>
                <span class="btn-text">${user.status === 'active' ? 'Desativar' : 'Ativar'}</span>
            </button>
            <button class="btn btn-danger delete-user" data-user-id="${user.id}">
                <i class="fas fa-trash"></i>
                <span class="btn-text">Excluir</span>
            </button>
        </div>
    `;
    
    // Adicionar event listeners aos botões
    card.querySelector('.edit-user').addEventListener('click', () => {
        openUserModal(user.id);
    });
    
    card.querySelector('.toggle-user').addEventListener('click', () => {
        toggleUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active');
    });
    
    card.querySelector('.delete-user').addEventListener('click', () => {
        deleteUser(user.id);
    });
    
    return card;
}

// Abrir modal do usuário
function openUserModal(userId = null) {
    editingUserId = userId;
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    
    if (userId) {
        // Modo edição
        title.textContent = 'Editar Usuário';
        
        // Carregar dados do usuário
        db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    const user = doc.data();
                    document.getElementById('user-name').value = user.name;
                    document.getElementById('user-email').value = user.email;
                    document.getElementById('user-type').value = user.userType;
                    document.getElementById('user-status').value = user.status || 'active';
                    // Limpar campo de senha
                    document.getElementById('user-password').value = '';
                }
            });
    }
    
    modal.classList.remove('hidden');
}

// Fechar modal do usuário
function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
    editingUserId = null;
}

// Salvar usuário
function saveUser() {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const userType = document.getElementById('user-type').value;
    const status = document.getElementById('user-status').value;
    
    if (!name || !email) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    if (password && password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        return;
    }
    
    const userData = {
        name: name,
        email: email,
        userType: userType,
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingUserId) {
        // Atualizar usuário existente
        const updatePromises = [db.collection('users').doc(editingUserId).update(userData)];
        
        // Se foi fornecida uma nova senha, atualizar a senha no Firebase Auth
        if (password) {
            updatePromises.push(
                auth.updateUserPassword(editingUserId, password).catch(error => {
                    // Se o usuário atual não tiver permissão para atualizar senhas, 
                    // usar o método de redefinição de senha por e-mail
                    if (error.code === 'auth/requires-recent-login') {
                        return auth.sendPasswordResetEmail(email).then(() => {
                            alert('Um e-mail de redefinição de senha foi enviado para o usuário.');
                        });
                    }
                    throw error;
                })
            );
        }
        
        Promise.all(updatePromises)
            .then(() => {
                alert('Usuário atualizado com sucesso!' + (password ? ' A nova senha foi definida.' : ''));
                closeUserModal();
                loadAdminUsers();
            })
            .catch(error => {
                console.error('Erro ao atualizar usuário:', error);
                alert('Erro ao atualizar usuário: ' + error.message);
            });
    }
}

// Alternar status do usuário
function toggleUserStatus(userId, newStatus) {
    db.collection('users').doc(userId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Status do usuário atualizado com sucesso!');
        loadAdminUsers();
    })
    .catch(error => {
        alert('Erro ao atualizar status do usuário: ' + error.message);
    });
}

// Excluir usuário
function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        // Excluir do Firestore
        db.collection('users').doc(userId).delete()
        .then(() => {
            alert('Usuário excluído com sucesso!');
            loadAdminUsers();
        })
        .catch(error => {
            alert('Erro ao excluir usuário: ' + error.message);
        });
    }
}

// Carregar relatórios para administrador
function loadAdminReports() {
    const reportsContent = document.getElementById('admin-reports-content');
    reportsContent.innerHTML = '<div class="card"><div class="card-content">Carregando relatórios...</div></div>';
    
    // Buscar estatísticas
    Promise.all([
        db.collection('users').get(),
        db.collection('quizzes').get(),
        db.collection('questions').get(),
        db.collection('userQuizzes')
            .where('status', '==', 'completed')
            .get(),
        db.collection('users')
            .where('userType', '==', 'aluno')
            .get()
    ]).then(([usersSnapshot, quizzesSnapshot, questionsSnapshot, userQuizzesSnapshot, alunosSnapshot]) => {
        
        const totalUsers = usersSnapshot.size;
        const totalQuizzes = quizzesSnapshot.size;
        const totalQuestions = questionsSnapshot.size;
        const totalAttempts = userQuizzesSnapshot.size;
        const totalAlunos = alunosSnapshot.size;
        
        // Calcular média de pontuação
        let totalScore = 0;
        let totalPossibleScore = 0;
        userQuizzesSnapshot.forEach(doc => {
            const userQuiz = doc.data();
            totalScore += userQuiz.score || 0;
            totalPossibleScore += userQuiz.score ? (userQuiz.score / userQuiz.percentage * 100) : 0;
        });
        
        const averageScore = totalAttempts > 0 ? (totalScore / totalPossibleScore * 100).toFixed(1) : 0;
        
        reportsContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Estatísticas Gerais</h3>
                </div>
                <div class="card-content">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${totalUsers}</div>
                            <div class="stat-label">Total de Usuários</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${totalAlunos}</div>
                            <div class="stat-label">Alunos</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${totalQuizzes}</div>
                            <div class="stat-label">Quizzes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${totalQuestions}</div>
                            <div class="stat-label">Questões</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${totalAttempts}</div>
                            <div class="stat-label">Tentativas</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${averageScore}%</div>
                            <div class="stat-label">Pontuação Média</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Distribuição de Desempenho</h3>
                </div>
                <div class="card-content">
                    <canvas id="performanceChart" width="400" height="200"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Quizzes Mais Populares</h3>
                </div>
                <div class="card-content">
                    <div id="popular-quizzes" class="popular-list">
                        Carregando...
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Top 5 Melhores Jogadores</h3>
                </div>
                <div class="card-content">
                    <div id="top-players" class="ranking-list">
                        Carregando...
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Ranking Geral Completo</h3>
                </div>
                <div class="card-content">
                    <div id="full-ranking" class="ranking-list">
                        Carregando...
                    </div>
                </div>
            </div>
        `;
        
        loadPerformanceChart();
        loadPopularQuizzes();
        loadTopPlayers();
        loadFullRanking();
        
    }).catch(error => {
        reportsContent.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar relatórios.</div></div>';
        console.error('Erro ao carregar relatórios:', error);
    });
}

// Carregar gráfico de desempenho
function loadPerformanceChart() {
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(querySnapshot => {
            const performanceRanges = {
                '0-20': 0,
                '21-40': 0,
                '41-60': 0,
                '61-80': 0,
                '81-100': 0
            };
            
            querySnapshot.forEach(doc => {
                const userQuiz = doc.data();
                const percentage = userQuiz.percentage || 0;
                
                if (percentage <= 20) performanceRanges['0-20']++;
                else if (percentage <= 40) performanceRanges['21-40']++;
                else if (percentage <= 60) performanceRanges['41-60']++;
                else if (percentage <= 80) performanceRanges['61-80']++;
                else performanceRanges['81-100']++;
            });
            
            const ctx = document.getElementById('performanceChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
                    datasets: [{
                        label: 'Número de Tentativas',
                        data: [
                            performanceRanges['0-20'],
                            performanceRanges['21-40'],
                            performanceRanges['41-60'],
                            performanceRanges['61-80'],
                            performanceRanges['81-100']
                        ],
                        backgroundColor: [
                            '#dc3545',
                            '#ffc107',
                            '#17a2b8',
                            '#28a745',
                            '#007bff'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Tentativas'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Faixa de Pontuação'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Erro ao carregar gráfico:', error);
        });
}

// Carregar quizzes populares
function loadPopularQuizzes() {
    const popularQuizzesElement = document.getElementById('popular-quizzes');
    
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(userQuizzesSnapshot => {
            const quizAttempts = {};
            
            // Contar tentativas por quiz
            userQuizzesSnapshot.forEach(doc => {
                const userQuiz = doc.data();
                const quizId = userQuiz.quizId;
                
                if (!quizAttempts[quizId]) {
                    quizAttempts[quizId] = {
                        attempts: 0,
                        totalScore: 0,
                        quizId: quizId
                    };
                }
                
                quizAttempts[quizId].attempts++;
                quizAttempts[quizId].totalScore += userQuiz.score || 0;
            });
            
            // Buscar informações dos quizzes
            const quizIds = Object.keys(quizAttempts);
            
            if (quizIds.length === 0) {
                popularQuizzesElement.innerHTML = '<p>Nenhum quiz foi realizado ainda.</p>';
                return;
            }
            
            db.collection('quizzes')
                .where(firebase.firestore.FieldPath.documentId(), 'in', quizIds)
                .get()
                .then(quizzesSnapshot => {
                    const quizzesMap = {};
                    quizzesSnapshot.forEach(doc => {
                        quizzesMap[doc.id] = doc.data();
                    });
                    
                    // Criar lista ordenada por tentativas
                    const popularList = Object.values(quizAttempts)
                        .sort((a, b) => b.attempts - a.attempts)
                        .slice(0, 5);
                    
                    let html = '';
                    popularList.forEach((item, index) => {
                        const quiz = quizzesMap[item.quizId];
                        if (quiz) {
                            const avgScore = item.attempts > 0 ? (item.totalScore / item.attempts).toFixed(1) : 0;
                            html += `
                                <div class="popular-item">
                                    <div class="popular-rank">${index + 1}</div>
                                    <div class="popular-info">
                                        <div class="popular-name">${quiz.title}</div>
                                        <div class="popular-details">
                                            ${item.attempts} tentativas • Média: ${avgScore} pts
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    });
                    
                    popularQuizzesElement.innerHTML = html || '<p>Nenhum dado disponível.</p>';
                });
        })
        .catch(error => {
            popularQuizzesElement.innerHTML = '<p>Erro ao carregar dados.</p>';
            console.error('Erro ao carregar quizzes populares:', error);
        });
}

// Carregar melhores jogadores
function loadTopPlayers() {
    const topPlayersElement = document.getElementById('top-players');
    
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(userQuizzesSnapshot => {
            const userScores = {};
            
            // Calcular pontuação total por usuário
            userQuizzesSnapshot.forEach(doc => {
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
            
            // Converter para array e ordenar
            const topPlayers = Object.values(userScores)
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 5);
            
            // Buscar informações dos usuários
            const userIds = topPlayers.map(player => player.userId);
            
            if (userIds.length === 0) {
                topPlayersElement.innerHTML = '<p>Nenhum jogador com pontuação ainda.</p>';
                return;
            }
            
            db.collection('users')
                .where(firebase.firestore.FieldPath.documentId(), 'in', userIds)
                .get()
                .then(usersSnapshot => {
                    const usersMap = {};
                    usersSnapshot.forEach(doc => {
                        usersMap[doc.id] = doc.data();
                    });
                    
                    let html = '';
                    topPlayers.forEach((player, index) => {
                        const user = usersMap[player.userId];
                        if (user) {
                            const avgScore = player.totalQuizzes > 0 ? (player.totalScore / player.totalQuizzes).toFixed(1) : 0;
                            html += `
                                <div class="ranking-item">
                                    <div class="ranking-position">${index + 1}</div>
                                    <div class="ranking-info">
                                        <div class="ranking-name">${user.name}</div>
                                        <div class="ranking-details">
                                            ${player.totalQuizzes} quiz(s) • Média: ${avgScore} pts
                                        </div>
                                    </div>
                                    <div class="ranking-score">${player.totalScore} pts</div>
                                </div>
                            `;
                        }
                    });
                    
                    topPlayersElement.innerHTML = html || '<p>Nenhum dado disponível.</p>';
                });
        })
        .catch(error => {
            topPlayersElement.innerHTML = '<p>Erro ao carregar dados.</p>';
            console.error('Erro ao carregar melhores jogadores:', error);
        });
}

// Carregar ranking completo
function loadFullRanking() {
    const fullRankingElement = document.getElementById('full-ranking');
    
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(userQuizzesSnapshot => {
            const userScores = {};
            
            // Calcular pontuação total por usuário
            userQuizzesSnapshot.forEach(doc => {
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
            
            // Converter para array e ordenar
            const fullRanking = Object.values(userScores)
                .sort((a, b) => b.totalScore - a.totalScore);
            
            // Buscar informações dos usuários
            const userIds = fullRanking.map(player => player.userId);
            
            if (userIds.length === 0) {
                fullRankingElement.innerHTML = '<p>Nenhum jogador com pontuação ainda.</p>';
                return;
            }
            
            db.collection('users')
                .where(firebase.firestore.FieldPath.documentId(), 'in', userIds)
                .get()
                .then(usersSnapshot => {
                    const usersMap = {};
                    usersSnapshot.forEach(doc => {
                        usersMap[doc.id] = doc.data();
                    });
                    
                    let html = '';
                    fullRanking.forEach((player, index) => {
                        const user = usersMap[player.userId];
                        if (user) {
                            const avgScore = player.totalQuizzes > 0 ? (player.totalScore / player.totalQuizzes).toFixed(1) : 0;
                            html += `
                                <div class="ranking-item">
                                    <div class="ranking-position">${index + 1}</div>
                                    <div class="ranking-info">
                                        <div class="ranking-name">${user.name}</div>
                                        <div class="ranking-details">
                                            ${player.totalQuizzes} quiz(s) • Média: ${avgScore} pts
                                        </div>
                                    </div>
                                    <div class="ranking-score">${player.totalScore} pts</div>
                                </div>
                            `;
                        }
                    });
                    
                    fullRankingElement.innerHTML = html || '<p>Nenhum dado disponível.</p>';
                });
        })
        .catch(error => {
            fullRankingElement.innerHTML = '<p>Erro ao carregar dados.</p>';
            console.error('Erro ao carregar ranking completo:', error);
        });
}
