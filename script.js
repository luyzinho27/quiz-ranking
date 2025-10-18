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

// Elementos da DOM
const authContainer = document.getElementById('auth-container');
const studentDashboard = document.getElementById('student-dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const quizContainer = document.getElementById('quiz-container');
const quizResult = document.getElementById('quiz-result');

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    initEventListeners();
    
    // Verificar se há um usuário logado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado
            getUserData(user.uid).then(userData => {
                currentUser = { ...user, ...userData };
                showDashboard();
            });
        } else {
            // Nenhum usuário logado
            showAuth();
        }
    });
});

// Inicializar autenticação
function initAuth() {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const adminOption = document.getElementById('admin-option');
    
    // Alternar entre login e cadastro
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });
    
    // Login
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showError('login-error', 'Por favor, preencha todos os campos.');
            return;
        }
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login bem-sucedido
                document.getElementById('login-error').textContent = '';
            })
            .catch((error) => {
                showError('login-error', 'E-mail ou senha incorretos.');
            });
    });
    
    // Cadastro
    registerBtn.addEventListener('click', () => {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const userType = document.getElementById('register-type').value;
        
        if (!name || !email || !password) {
            showError('register-error', 'Por favor, preencha todos os campos.');
            return;
        }
        
        // Verificar se já existe um administrador
        if (userType === 'admin') {
            checkAdminExists().then(adminExists => {
                if (adminExists) {
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
    
    // Verificar se já existe um administrador
    checkAdminExists().then(adminExists => {
        if (adminExists) {
            adminOption.disabled = true;
        }
    });
}

// Registrar novo usuário
function registerUser(name, email, password, userType) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Salvar dados adicionais do usuário no Firestore
            return db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                userType: userType,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            document.getElementById('register-error').textContent = '';
            // Mudar para a aba de login após cadastro bem-sucedido
            document.getElementById('login-tab').click();
        })
        .catch((error) => {
            showError('register-error', 'Erro ao cadastrar: ' + error.message);
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
    
    // Modal de quiz
    initQuizModal();
    
    // Modal de questão
    initQuestionModal();
    
    // Controles do quiz
    initQuizControls();
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
}

// Alternar entre abas
function switchTab(tabId, sectionId) {
    // Remover classe active de todas as abas e seções
    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.section');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    // Adicionar classe active à aba e seção selecionadas
    document.getElementById(tabId).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

// Inicializar modal de quiz
function initQuizModal() {
    const modal = document.getElementById('quiz-modal');
    const closeBtn = document.querySelector('#quiz-modal .close');
    const form = document.getElementById('quiz-form');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveQuiz();
    });
}

// Inicializar modal de questão
function initQuestionModal() {
    const modal = document.getElementById('question-modal');
    const closeBtn = document.querySelector('#question-modal .close');
    const form = document.getElementById('question-form');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveQuestion();
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
    auth.signOut().then(() => {
        currentUser = null;
        showAuth();
    });
}

// Mostrar erro
function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

// Carregar quizzes para alunos
function loadQuizzes() {
    const quizzesList = document.getElementById('quizzes-list');
    quizzesList.innerHTML = '<p>Carregando quizzes...</p>';
    
    db.collection('quizzes')
        .where('status', '==', 'active')
        .get()
        .then(querySnapshot => {
            quizzesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<p>Nenhum quiz disponível no momento.</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const quiz = { id: doc.id, ...doc.data() };
                const quizCard = createQuizCard(quiz);
                quizzesList.appendChild(quizCard);
            });
        })
        .catch(error => {
            quizzesList.innerHTML = '<p>Erro ao carregar quizzes.</p>';
            console.error('Erro ao carregar quizzes:', error);
        });
}

// Carregar quizzes para administradores
function loadQuizzesAdmin() {
    const quizzesList = document.getElementById('quizzes-admin-list');
    quizzesList.innerHTML = '<p>Carregando quizzes...</p>';
    
    db.collection('quizzes').get()
        .then(querySnapshot => {
            quizzesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<p>Nenhum quiz criado ainda.</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const quiz = { id: doc.id, ...doc.data() };
                const quizCard = createQuizAdminCard(quiz);
                quizzesList.appendChild(quizCard);
            });
        })
        .catch(error => {
            quizzesList.innerHTML = '<p>Erro ao carregar quizzes.</p>';
            console.error('Erro ao carregar quizzes:', error);
        });
}

// Criar card de quiz para alunos
function createQuizCard(quiz) {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    
    // Verificar se o usuário já iniciou este quiz
    const userQuizRef = db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', 'in', ['in-progress', 'completed']);
    
    userQuizRef.get().then(querySnapshot => {
        let buttonText = 'Iniciar Quiz';
        let buttonClass = 'btn';
        let statusText = 'Não iniciado';
        
        if (!querySnapshot.empty) {
            const userQuiz = querySnapshot.docs[0].data();
            
            if (userQuiz.status === 'in-progress') {
                buttonText = 'Continuar Quiz';
                buttonClass = 'btn btn-primary';
                statusText = 'Em andamento';
            } else if (userQuiz.status === 'completed') {
                buttonText = 'Ver Resultado';
                buttonClass = 'btn btn-secondary';
                statusText = 'Concluído';
            }
        }
        
        card.innerHTML = `
            <h3>${quiz.title}</h3>
            <p>${quiz.description || 'Sem descrição'}</p>
            <div class="quiz-info">
                <span>Tempo: ${quiz.time} min</span>
                <span>Questões: ${quiz.questionsCount}</span>
                <span>Status: ${statusText}</span>
            </div>
            <div class="quiz-actions">
                <button class="${buttonClass}" data-quiz-id="${quiz.id}">${buttonText}</button>
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
    card.className = 'quiz-card';
    
    card.innerHTML = `
        <h3>${quiz.title}</h3>
        <p>${quiz.description || 'Sem descrição'}</p>
        <div class="quiz-info">
            <span>Tempo: ${quiz.time} min</span>
            <span>Questões: ${quiz.questionsCount}</span>
            <span>Status: ${quiz.status === 'active' ? 'Ativo' : 'Inativo'}</span>
        </div>
        <div class="quiz-actions">
            <button class="btn" data-action="edit" data-quiz-id="${quiz.id}">Editar</button>
            <button class="btn btn-secondary" data-action="delete" data-quiz-id="${quiz.id}">Excluir</button>
            <button class="btn ${quiz.status === 'active' ? 'btn-secondary' : 'btn-primary'}" 
                    data-action="toggle-status" data-quiz-id="${quiz.id}">
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

// Salvar quiz
function saveQuiz() {
    const form = document.getElementById('quiz-form');
    const quizId = form.getAttribute('data-quiz-id');
    const quizData = {
        title: document.getElementById('quiz-title').value,
        description: document.getElementById('quiz-description').value,
        time: parseInt(document.getElementById('quiz-time').value),
        questionsCount: parseInt(document.getElementById('quiz-questions-count').value),
        status: document.getElementById('quiz-status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (quizId) {
        // Atualizar quiz existente
        db.collection('quizzes').doc(quizId).update(quizData)
            .then(() => {
                alert('Quiz atualizado com sucesso!');
                document.getElementById('quiz-modal').classList.add('hidden');
                loadQuizzesAdmin();
            })
            .catch(error => {
                alert('Erro ao atualizar quiz: ' + error.message);
            });
    } else {
        // Criar novo quiz
        quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        quizData.createdBy = currentUser.uid;
        
        db.collection('quizzes').add(quizData)
            .then(() => {
                alert('Quiz criado com sucesso!');
                document.getElementById('quiz-modal').classList.add('hidden');
                loadQuizzesAdmin();
            })
            .catch(error => {
                alert('Erro ao criar quiz: ' + error.message);
            });
    }
}

// Editar quiz
function editQuiz(quizId) {
    db.collection('quizzes').doc(quizId).get()
        .then(doc => {
            if (doc.exists) {
                const quiz = { id: doc.id, ...doc.data() };
                openQuizModal(quiz);
            }
        })
        .catch(error => {
            alert('Erro ao carregar quiz: ' + error.message);
        });
}

// Excluir quiz
function deleteQuiz(quizId) {
    if (confirm('Tem certeza que deseja excluir este quiz?')) {
        db.collection('quizzes').doc(quizId).delete()
            .then(() => {
                alert('Quiz excluído com sucesso!');
                loadQuizzesAdmin();
            })
            .catch(error => {
                alert('Erro ao excluir quiz: ' + error.message);
            });
    }
}

// Alternar status do quiz
function toggleQuizStatus(quizId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    db.collection('quizzes').doc(quizId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert(`Quiz ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
        loadQuizzesAdmin();
    })
    .catch(error => {
        alert('Erro ao alterar status do quiz: ' + error.message);
    });
}

// Carregar questões
function loadQuestions() {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = '<p>Carregando questões...</p>';
    
    db.collection('questions').get()
        .then(querySnapshot => {
            questionsList.innerHTML = '';
            
            if (querySnapshot.empty) {
                questionsList.innerHTML = '<p>Nenhuma questão cadastrada ainda.</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const question = { id: doc.id, ...doc.data() };
                const questionCard = createQuestionCard(question);
                questionsList.appendChild(questionCard);
            });
        })
        .catch(error => {
            questionsList.innerHTML = '<p>Erro ao carregar questões.</p>';
            console.error('Erro ao carregar questões:', error);
        });
}

// Criar card de questão
function createQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'question-card';
    
    card.innerHTML = `
        <h3>${question.text}</h3>
        <div class="question-info">
            <span>Categoria: ${question.category || 'Sem categoria'}</span>
            <span>Resposta correta: ${question.correctAnswer.toUpperCase()}</span>
        </div>
        <div class="question-actions">
            <button class="btn" data-action="edit" data-question-id="${question.id}">Editar</button>
            <button class="btn btn-secondary" data-action="delete" data-question-id="${question.id}">Excluir</button>
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
        form.setAttribute('data-question-id', question.id);
    } else {
        // Modo criação
        title.textContent = 'Adicionar Questão';
        form.reset();
        form.removeAttribute('data-question-id');
    }
    
    modal.classList.remove('hidden');
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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (questionId) {
        // Atualizar questão existente
        db.collection('questions').doc(questionId).update(questionData)
            .then(() => {
                alert('Questão atualizada com sucesso!');
                document.getElementById('question-modal').classList.add('hidden');
                loadQuestions();
            })
            .catch(error => {
                alert('Erro ao atualizar questão: ' + error.message);
            });
    } else {
        // Criar nova questão
        questionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        questionData.createdBy = currentUser.uid;
        
        db.collection('questions').add(questionData)
            .then(() => {
                alert('Questão criada com sucesso!');
                document.getElementById('question-modal').classList.add('hidden');
                loadQuestions();
            })
            .catch(error => {
                alert('Erro ao criar questão: ' + error.message);
            });
    }
}

// Editar questão
function editQuestion(questionId) {
    db.collection('questions').doc(questionId).get()
        .then(doc => {
            if (doc.exists) {
                const question = { id: doc.id, ...doc.data() };
                openQuestionModal(question);
            }
        })
        .catch(error => {
            alert('Erro ao carregar questão: ' + error.message);
        });
}

// Excluir questão
function deleteQuestion(questionId) {
    if (confirm('Tem certeza que deseja excluir esta questão?')) {
        db.collection('questions').doc(questionId).delete()
            .then(() => {
                alert('Questão excluída com sucesso!');
                loadQuestions();
            })
            .catch(error => {
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
            const questions = JSON.parse(e.target.result);
            
            if (!Array.isArray(questions)) {
                alert('O arquivo JSON deve conter um array de questões.');
                return;
            }
            
            // Validar e importar questões
            importQuestions(questions);
        } catch (error) {
            alert('Erro ao processar arquivo JSON: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Limpar o input para permitir importar o mesmo arquivo novamente
    event.target.value = '';
}

// Importar questões para o Firestore
function importQuestions(questions) {
    let importedCount = 0;
    let errorCount = 0;
    
    questions.forEach((question, index) => {
        // Validar estrutura da questão
        if (!question.text || !question.options || !question.correctAnswer) {
            console.error(`Questão ${index} inválida: estrutura incorreta`);
            errorCount++;
            return;
        }
        
        const questionData = {
            text: question.text,
            options: question.options,
            correctAnswer: question.correctAnswer,
            category: question.category || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        };
        
        db.collection('questions').add(questionData)
            .then(() => {
                importedCount++;
                
                if (importedCount + errorCount === questions.length) {
                    alert(`Importação concluída! ${importedCount} questões importadas, ${errorCount} erros.`);
                    loadQuestions();
                }
            })
            .catch(error => {
                errorCount++;
                console.error(`Erro ao importar questão ${index}:`, error);
                
                if (importedCount + errorCount === questions.length) {
                    alert(`Importação concluída! ${importedCount} questões importadas, ${errorCount} erros.`);
                    loadQuestions();
                }
            });
    });
}

// Carregar usuários (apenas para administradores)
function loadUsers() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<p>Carregando usuários...</p>';
    
    db.collection('users').get()
        .then(querySnapshot => {
            usersList.innerHTML = '';
            
            if (querySnapshot.empty) {
                usersList.innerHTML = '<p>Nenhum usuário cadastrado.</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userCard = createUserCard(user);
                usersList.appendChild(userCard);
            });
        })
        .catch(error => {
            usersList.innerHTML = '<p>Erro ao carregar usuários.</p>';
            console.error('Erro ao carregar usuários:', error);
        });
}

// Criar card de usuário
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    card.innerHTML = `
        <h3>${user.name}</h3>
        <div class="user-info">
            <span>E-mail: ${user.email}</span>
            <span>Tipo: ${user.userType === 'admin' ? 'Administrador' : 'Aluno'}</span>
            <span>Cadastrado em: ${user.createdAt ? user.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</span>
        </div>
        <div class="user-actions">
            ${user.userType !== 'admin' ? `<button class="btn btn-secondary" data-action="delete" data-user-id="${user.id}">Excluir</button>` : ''}
        </div>
    `;
    
    // Adicionar event listeners aos botões
    const buttons = card.querySelectorAll('button');
    buttons.forEach(button => {
        const action = button.getAttribute('data-action');
        const userId = button.getAttribute('data-user-id');
        
        button.addEventListener('click', () => {
            if (action === 'delete') {
                deleteUser(userId);
            }
        });
    });
    
    return card;
}

// Excluir usuário
function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        // Excluir da autenticação do Firebase
        // Nota: Para excluir usuários da autenticação, você precisa de privilégios de administrador
        // e usar o Firebase Admin SDK no backend. Aqui vamos apenas excluir do Firestore.
        
        db.collection('users').doc(userId).delete()
            .then(() => {
                alert('Usuário excluído com sucesso!');
                loadUsers();
            })
            .catch(error => {
                alert('Erro ao excluir usuário: ' + error.message);
            });
    }
}

// Carregar ranking
function loadRanking() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<p>Carregando ranking...</p>';
    
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
                rankingList.innerHTML = '<p>Nenhum resultado disponível no ranking.</p>';
                return;
            }
            
            db.collection('users')
                .where(firebase.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 10)) // Limitar a 10 usuários
                .get()
                .then(usersSnapshot => {
                    const usersMap = {};
                    usersSnapshot.forEach(doc => {
                        usersMap[doc.id] = doc.data();
                    });
                    
                    // Exibir ranking
                    rankingList.innerHTML = '';
                    
                    ranking.slice(0, 10).forEach((item, index) => {
                        const user = usersMap[item.userId];
                        if (!user) return;
                        
                        const rankingItem = document.createElement('div');
                        rankingItem.className = 'ranking-item';
                        
                        rankingItem.innerHTML = `
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${user.name}</div>
                                <div class="ranking-details">${item.totalQuizzes} quiz(s) realizado(s)</div>
                            </div>
                            <div class="ranking-score">${item.totalScore} pts</div>
                        `;
                        
                        rankingList.appendChild(rankingItem);
                    });
                });
        })
        .catch(error => {
            rankingList.innerHTML = '<p>Erro ao carregar ranking.</p>';
            console.error('Erro ao carregar ranking:', error);
        });
}

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
                    currentQuiz = quiz;
                    userAnswers = userQuiz.answers || [];
                    currentQuestionIndex = userQuiz.currentQuestionIndex || 0;
                    
                    // Buscar questões do quiz
                    loadQuizQuestions(quiz.id);
                }
            } else {
                // Iniciar novo quiz
                currentQuiz = quiz;
                userAnswers = [];
                currentQuestionIndex = 0;
                
                // Criar registro do quiz do usuário
                db.collection('userQuizzes').add({
                    userId: currentUser.uid,
                    quizId: quiz.id,
                    status: 'in-progress',
                    answers: [],
                    currentQuestionIndex: 0,
                    startTime: firebase.firestore.FieldValue.serverTimestamp(),
                    attempts: 1
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
    // Em uma implementação real, você teria uma relação entre quizzes e questões
    // Aqui vamos buscar questões aleatórias do banco
    db.collection('questions').get()
        .then(querySnapshot => {
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
            
            for (let i = 0; i < questionCount; i++) {
                const randomIndex = Math.floor(Math.random() * allQuestions.length);
                currentQuestions.push(allQuestions[randomIndex]);
                allQuestions.splice(randomIndex, 1);
            }
            
            // Iniciar quiz
            showQuiz();
        })
        .catch(error => {
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
    
    // Iniciar timer
    timeRemaining = currentQuiz.time * 60; // Converter para segundos
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
    document.getElementById('quiz-timer').textContent = 
        `Tempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    document.getElementById('quiz-progress').textContent = 
        `Questão ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    
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
    document.getElementById('next-question').disabled = currentQuestionIndex === currentQuestions.length - 1;
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
                    completedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .then(() => {
            // Mostrar resultado
            showQuizResult(currentQuiz.id, score, percentage);
        })
        .catch(error => {
            console.error('Erro ao finalizar quiz:', error);
            // Mostrar resultado mesmo com erro
            showQuizResult(currentQuiz.id, score, percentage);
        });
}

// Mostrar resultado do quiz
function showQuizResult(quizId, score = null, percentage = null) {
    if (score !== null && percentage !== null) {
        // Exibir resultado recém-calculado
        document.getElementById('score-display').innerHTML = `
            <p>Você acertou <strong>${score}</strong> de <strong>${currentQuestions.length}</strong> questões.</p>
            <p>Pontuação: <strong>${percentage.toFixed(2)}%</strong></p>
        `;
        
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
                    
                    document.getElementById('score-display').innerHTML = `
                        <p>Você acertou <strong>${userQuiz.score}</strong> de <strong>${currentQuestions.length}</strong> questões.</p>
                        <p>Pontuação: <strong>${userQuiz.percentage.toFixed(2)}%</strong></p>
                    `;
                    
                    studentDashboard.classList.add('hidden');
                    quizResult.classList.remove('hidden');
                }
            })
            .catch(error => {
                alert('Erro ao carregar resultado: ' + error.message);
            });
    }
}
