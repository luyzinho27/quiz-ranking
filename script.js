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

// Variáveis globais
let currentUser = null;
let quizzes = [];
let userProgress = [];
let allUsers = [];
let allQuizzes = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = null;
let timerInterval = null;

// Pool de questões baseadas nos PDFs
function generateQuestionsFromPDFs() {
    return {
        'base-binaria': [
            {
                text: "Qual é a base do sistema binário?",
                options: ["2", "8", "10", "16"],
                correctAnswer: 0,
                explanation: "O sistema binário utiliza base 2, representando números apenas com os dígitos 0 e 1."
            },
            {
                text: "Como é representado o número decimal 10 em binário?",
                options: ["1010", "1100", "1001", "1110"],
                correctAnswer: 0,
                explanation: "10 em decimal equivale a 1010 em binário (8 + 0 + 2 + 0)."
            },
            {
                text: "Qual é o valor do número binário 1101 em decimal?",
                options: ["11", "12", "13", "14"],
                correctAnswer: 2,
                explanation: "1101 em binário = 1×8 + 1×4 + 0×2 + 1×1 = 13 em decimal."
            },
            {
                text: "Quantos bits são necessários para representar o número decimal 255?",
                options: ["4", "6", "8", "10"],
                correctAnswer: 2,
                explanation: "255 em decimal equivale a 11111111 em binário, que requer 8 bits."
            },
            {
                text: "Qual é a principal vantagem do sistema hexadecimal?",
                options: ["É mais fácil de calcular", "Representa números grandes com menos dígitos", "É usado apenas em matemática", "É o sistema mais antigo"],
                correctAnswer: 1,
                explanation: "O hexadecimal permite representar números grandes de forma mais compacta, sendo útil em programação."
            },
            {
                text: "Como é representado o número decimal 15 em hexadecimal?",
                options: ["A", "B", "E", "F"],
                correctAnswer: 3,
                explanation: "15 em decimal equivale a F em hexadecimal."
            },
            {
                text: "Qual é o valor do número octal 77 em decimal?",
                options: ["63", "77", "49", "55"],
                correctAnswer: 0,
                explanation: "77 em octal = 7×8 + 7×1 = 63 em decimal."
            },
            {
                text: "Quantos valores diferentes podem ser representados com 4 bits?",
                options: ["8", "16", "32", "64"],
                correctAnswer: 1,
                explanation: "4 bits podem representar 2⁴ = 16 valores diferentes (de 0 a 15)."
            },
            {
                text: "Qual operação bit a bit é usada para verificar se um bit específico está ativo?",
                options: ["AND", "OR", "XOR", "NOT"],
                correctAnswer: 0,
                explanation: "A operação AND com uma máscara de bits permite verificar se bits específicos estão ativos."
            },
            {
                text: "O que é um nibble em computação?",
                options: ["8 bits", "16 bits", "32 bits", "4 bits"],
                correctAnswer: 3,
                explanation: "Um nibble corresponde a 4 bits, ou metade de um byte."
            }
        ],
        'historia-computadores': [
            {
                text: "Qual foi considerado o primeiro computador programável?",
                options: ["ENIAC", "Mark I", "Z1", "Colossus"],
                correctAnswer: 2,
                explanation: "O Z1, desenvolvido por Konrad Zuse em 1938, é considerado o primeiro computador programável."
            },
            {
                text: "Em que década surgiu a primeira geração de computadores?",
                options: ["1930-1940", "1940-1950", "1950-1960", "1960-1970"],
                correctAnswer: 1,
                explanation: "A primeira geração (1940-1950) utilizava válvulas termiônicas."
            },
            {
                text: "Qual tecnologia foi usada na primeira geração de computadores?",
                options: ["Transistores", "Circuitos integrados", "Válvulas termiônicas", "Microprocessadores"],
                correctAnswer: 2,
                explanation: "A primeira geração utilizava válvulas termiônicas como componente principal."
            },
            {
                text: "Quem é considerado o pai da computação?",
                options: ["Bill Gates", "Alan Turing", "Charles Babbage", "Steve Jobs"],
                correctAnswer: 2,
                explanation: "Charles Babbage é considerado o pai da computação por projetar a Máquina Analítica."
            },
            {
                text: "Qual caracterizou a segunda geração de computadores?",
                options: ["Válvulas termiônicas", "Transistores", "Circuitos integrados", "Inteligência artificial"],
                correctAnswer: 1,
                explanation: "A segunda geração (1959-1964) substituiu as válvulas por transistores."
            },
            {
                text: "O que caracterizou a terceira geração de computadores?",
                options: ["Uso de circuitos integrados", "Uso de transistores", "Uso de válvulas", "Inteligência artificial"],
                correctAnswer: 0,
                explanation: "A terceira geração (1964-1970) introduziu os circuitos integrados."
            },
            {
                text: "Qual empresa desenvolveu o primeiro microprocessador?",
                options: ["IBM", "Intel", "AMD", "Motorola"],
                correctAnswer: 1,
                explanation: "A Intel desenvolveu o primeiro microprocessador, o Intel 4004, em 1971."
            },
            {
                text: "Em que ano foi lançado o IBM PC?",
                options: ["1975", "1981", "1984", "1990"],
                correctAnswer: 1,
                explanation: "O IBM PC foi lançado em 1981, revolucionando o mercado de computadores pessoais."
            },
            {
                text: "Qual foi a principal inovação da quarta geração de computadores?",
                options: ["Válvulas termiônicas", "Transistores", "Circuitos integrados", "Microprocessadores"],
                correctAnswer: 3,
                explanation: "A quarta geração (a partir de 1970) caracterizou-se pelo uso de microprocessadores."
            },
            {
                text: "O que é o ENIAC?",
                options: ["Primeiro computador pessoal", "Primeiro supercomputador", "Primeiro computador eletrônico de grande escala", "Primeiro laptop"],
                correctAnswer: 2,
                explanation: "O ENIAC foi o primeiro computador eletrônico digital de grande escala, desenvolvido em 1946."
            }
        ],
        'arquitetura-von-neumann': [
            {
                text: "Qual é o conceito fundamental da Arquitetura de Von Neumann?",
                options: ["Programas e dados armazenados separadamente", "Programas e dados armazenados na mesma memória", "Uso exclusivo de memória ROM", "Processamento paralelo"],
                correctAnswer: 1,
                explanation: "O conceito de 'programa armazenado' permite que programas e dados compartilhem a mesma memória."
            },
            {
                text: "Quais são os componentes principais da Arquitetura de Von Neumann?",
                options: ["CPU, Memória, Dispositivos E/S", "CPU, GPU, RAM", "Processador, Placa-mãe, HD", "Monitor, Teclado, Mouse"],
                correctAnswer: 0,
                explanation: "Os componentes principais são: CPU, Memória Principal e Dispositivos de Entrada/Saída."
            },
            {
                text: "O que é o barramento (bus) na arquitetura de Von Neumann?",
                options: ["Um tipo de memória", "Um componente de processamento", "Um sistema de comunicação entre componentes", "Um dispositivo de entrada"],
                correctAnswer: 2,
                explanation: "O barramento é o sistema de comunicação que interconecta os componentes do computador."
            },
            {
                text: "Qual componente é responsável por executar instruções?",
                options: ["Memória Principal", "Unidade de Controle", "Unidade Lógica e Aritmética", "Dispositivos de E/S"],
                correctAnswer: 1,
                explanation: "A Unidade de Controle é responsável por buscar, decodificar e executar instruções."
            },
            {
                text: "O que significa 'stored-program concept'?",
                options: ["Programas armazenados em disco rígido", "Programas e dados na mesma memória", "Programas em memória somente leitura", "Programas executados da internet"],
                correctAnswer: 1,
                explanation: "O conceito de programa armazenado permite que programas sejam tratados como dados."
            },
            {
                text: "Qual é a função da Unidade Lógica e Aritmética (ULA)?",
                options: ["Controlar o fluxo de dados", "Armazenar programas", "Executar operações matemáticas e lógicas", "Gerenciar dispositivos de E/S"],
                correctAnswer: 2,
                explanation: "A ULA executa todas as operações aritméticas e lógicas do processador."
            },
            {
                text: "O que é o 'Von Neumann bottleneck'?",
                options: ["Limitação na velocidade do processador", "Limitação na comunicação entre CPU e memória", "Falta de memória RAM", "Problemas com dispositivos de E/S"],
                correctAnswer: 1,
                explanation: "É a limitação de desempenho causada pelo barramento entre CPU e memória."
            },
            {
                text: "Qual componente armazena o endereço da próxima instrução?",
                options: ["Accumulator", "Program Counter", "Instruction Register", "Memory Address Register"],
                correctAnswer: 1,
                explanation: "O Program Counter (PC) armazena o endereço da próxima instrução a ser executada."
            },
            {
                text: "Como as instruções são executadas na arquitetura de Von Neumann?",
                options: ["Em paralelo", "Sequencialmente", "Aleatoriamente", "Dependendo da prioridade"],
                correctAnswer: 1,
                explanation: "As instruções são executadas sequencialmente, uma após a outra."
            },
            {
                text: "Qual a principal diferença entre arquitetura Harvard e Von Neumann?",
                options: ["Uso de memórias separadas para dados e instruções", "Velocidade de processamento", "Tipo de processador usado", "Método de execução de instruções"],
                correctAnswer: 0,
                explanation: "Harvard usa memórias separadas para dados e instruções, enquanto Von Neumann usa memória unificada."
            }
        ],
        'componentes-computador': [
            {
                text: "Qual componente é considerado o 'cérebro' do computador?",
                options: ["Memória RAM", "Processador (CPU)", "Disco Rígido", "Placa-mãe"],
                correctAnswer: 1,
                explanation: "A CPU é o cérebro do computador, responsável por processar instruções."
            },
            {
                text: "O que é a memória RAM?",
                options: ["Memória de armazenamento permanente", "Memória de armazenamento temporário", "Memória somente leitura", "Memória de backup"],
                correctAnswer: 1,
                explanation: "RAM é memória volátil de acesso aleatório usada para armazenamento temporário."
            },
            {
                text: "Qual a função da placa-mãe (motherboard)?",
                options: ["Processar dados", "Armazenar arquivos", "Conectar todos os componentes do computador", "Exibir imagens na tela"],
                correctAnswer: 2,
                explanation: "A placa-mãe interconecta todos os componentes do computador."
            },
            {
                text: "O que é um SSD?",
                options: ["Unidade de processamento gráfico", "Memória de acesso aleatório", "Disco de estado sólido", "Sistema operacional"],
                correctAnswer: 2,
                explanation: "SSD é um dispositivo de armazenamento que usa memória flash, mais rápido que HDs tradicionais."
            },
            {
                text: "Qual componente é responsável pelo processamento gráfico?",
                options: ["CPU", "GPU", "RAM", "HDD"],
                correctAnswer: 1,
                explanation: "A GPU (Unidade de Processamento Gráfico) é especializada em processamento de gráficos."
            },
            {
                text: "O que é a BIOS?",
                options: ["Sistema operacional", "Software básico de inicialização", "Programa de edição de texto", "Antivirus"],
                correctAnswer: 1,
                explanation: "BIOS é o firmware responsável pela inicialização do computador e configuração de hardware."
            },
            {
                text: "Qual a diferença entre memória RAM e ROM?",
                options: ["RAM é mais rápida que ROM", "RAM é volátil, ROM é não volátil", "ROM é usada para processamento, RAM para armazenamento", "Não há diferença"],
                correctAnswer: 1,
                explanation: "RAM é volátil (perde dados sem energia), ROM é não volátil (mantém dados sem energia)."
            },
            {
                text: "O que é um barramento (bus) em um computador?",
                options: ["Um tipo de memória", "Um caminho para transmissão de dados", "Um processador auxiliar", "Um dispositivo de entrada"],
                correctAnswer: 1,
                explanation: "Barramento é o sistema de comunicação que permite a transferência de dados entre componentes."
            },
            {
                text: "Qual componente controla o fluxo de dados entre CPU e memória?",
                options: ["Northbridge", "Southbridge", "BIOS", "Cache"],
                correctAnswer: 0,
                explanation: "O Northbridge gerencia a comunicação entre CPU, RAM e GPU."
            },
            {
                text: "O que é cache L1, L2, L3 em um processador?",
                options: ["Diferentes tipos de memória RAM", "Níveis de memória rápida dentro do processador", "Tipos de disco rígido", "Velocidades de clock do processador"],
                correctAnswer: 1,
                explanation: "São memórias cache internas do processador, com L1 sendo a mais rápida e próxima do núcleo."
            }
        ],
        'instrucoes-maquina': [
            {
                text: "O que é uma instrução de máquina?",
                options: ["Um comando em linguagem de alto nível", "Um comando que o processador pode executar diretamente", "Um programa completo", "Um arquivo de configuração"],
                correctAnswer: 1,
                explanation: "Instruções de máquina são comandos binários que o processador executa diretamente."
            },
            {
                text: "Qual é o formato básico de uma instrução de máquina?",
                options: ["Opcode + Operandos", "Nome da instrução + Parâmetros", "Endereço + Valor", "Registrador + Memória"],
                correctAnswer: 0,
                explanation: "Uma instrução básica contém o opcode (código da operação) e os operandos (dados)."
            },
            {
                text: "O que é um opcode?",
                options: ["O endereço de memória", "O código da operação a ser executada", "O valor do operando", "O registrador usado"],
                correctAnswer: 1,
                explanation: "Opcode especifica qual operação a CPU deve executar."
            },
            {
                text: "Quantos operandos uma instrução LOAD normalmente tem?",
                options: ["0", "1", "2", "3"],
                correctAnswer: 2,
                explanation: "LOAD geralmente tem dois operandos: origem dos dados e destino."
            },
            {
                text: "O que faz a instrução ADD?",
                options: ["Carrega um valor da memória", "Armazena um valor na memória", "Soma dois valores", "Compara dois valores"],
                correctAnswer: 2,
                explanation: "ADD realiza a operação de adição entre dois valores."
            },
            {
                text: "Qual instrução é usada para desvio condicional?",
                options: ["JMP", "CMP + JZ", "MOV", "NOP"],
                correctAnswer: 1,
                explanation: "Desvios condicionais usam comparação (CMP) seguida de jump condicional (JZ, JNZ, etc)."
            },
            {
                text: "O que é o conjunto de instruções (instruction set) de um processador?",
                options: ["A velocidade do processador", "Todas as instruções que o processador pode executar", "A quantidade de memória cache", "O número de núcleos do processador"],
                correctAnswer: 1,
                explanation: "É o repertório completo de instruções que uma CPU pode executar."
            },
            {
                text: "O que significa CISC em arquitetura de processadores?",
                options: ["Complex Instruction Set Computer", "Compact Instruction Set Computer", "Central Instruction Set Computer", "Complete Instruction Set Computer"],
                correctAnswer: 0,
                explanation: "CISC usa instruções complexas que realizam múltiplas operações."
            },
            {
                text: "Qual a principal característica da arquitetura RISC?",
                options: ["Instruções complexas e variadas", "Instruções simples e de execução rápida", "Muitos modos de endereçamento", "Instruções de tamanho variável"],
                correctAnswer: 1,
                explanation: "RISC usa instruções simples e de execução rápida."
            },
            {
                text: "O que é um ciclo de instrução?",
                options: ["A velocidade do processador em GHz", "O processo de buscar, decodificar e executar uma instrução", "O tempo para acessar a memória RAM", "A quantidade de instruções por segundo"],
                correctAnswer: 1,
                explanation: "Ciclo de instrução compreende: busca, decodificação, execução e armazenamento do resultado."
            }
        ],
        'traducao-instrucoes': [
            {
                text: "O que é um compilador?",
                options: ["Um programa que traduz código assembly para máquina", "Um programa que traduz código de alto nível para máquina", "Um programa que executa código diretamente", "Um tipo de processador"],
                correctAnswer: 1,
                explanation: "Compilador traduz código de alto nível para linguagem de máquina."
            },
            {
                text: "Qual a diferença entre compilação e interpretação?",
                options: ["Compilação é mais lenta que interpretação", "Compilação gera código executável, interpretação executa linha a linha", "Interpretação gera código executável", "Não há diferença"],
                correctAnswer: 1,
                explanation: "Compilação gera código executável antecipadamente, interpretação executa instrução por instrução."
            },
            {
                text: "O que é um assembler?",
                options: ["Um compilador para linguagem C", "Um tradutor de assembly para código de máquina", "Um interpretador de Python", "Um tipo de memória"],
                correctAnswer: 1,
                explanation: "Assembler converte código assembly em código de máquina."
            },
            {
                text: "O que são linguagens de baixo nível?",
                options: ["Linguagens como Python e Java", "Linguagens próximas à linguagem de máquina", "Linguagens para desenvolvimento web", "Linguagens com muitas abstrações"],
                correctAnswer: 1,
                explanation: "Linguagens de baixo nível são próximas do hardware, como assembly."
            },
            {
                text: "Qual é a vantagem das linguagens de alto nível?",
                options: ["Execução mais rápida", "Maior controle sobre o hardware", "Facilidade de programação e portabilidade", "Acesso direto à memória"],
                correctAnswer: 2,
                explanation: "Linguagens de alto nível são mais fáceis de usar e portáveis entre diferentes plataformas."
            },
            {
                text: "O que é código objeto?",
                options: ["Código fonte em linguagem de alto nível", "Código em linguagem assembly", "Código de máquina gerado pelo compilador", "Código HTML"],
                correctAnswer: 2,
                explanation: "Código objeto é o código de máquina gerado pelo compilador a partir do código fonte."
            },
            {
                text: "O que faz o linker (ligador)?",
                options: ["Traduz código fonte para assembly", "Combina múltiplos arquivos objeto em um executável", "Executa o programa", "Depura o código"],
                correctAnswer: 1,
                explanation: "Linker combina múltiplos arquivos objeto e bibliotecas em um único executável."
            },
            {
                text: "O que é um bytecode?",
                options: ["Código de máquina nativo", "Código intermediário executado por uma máquina virtual", "Código assembly", "Código fonte"],
                correctAnswer: 1,
                explanation: "Bytecode é código intermediário executado por uma máquina virtual, como na Java VM."
            },
            {
                text: "Qual linguagem usa compilação JIT (Just-In-Time)?",
                options: ["C", "C++", "Java", "Assembly"],
                correctAnswer: 2,
                explanation: "Java usa compilação JIT, que compila bytecode para código nativo durante a execução."
            },
            {
                text: "O que é cross-compilation?",
                options: ["Compilação otimizada para velocidade", "Compilação para uma plataforma diferente da atual", "Compilação com múltiplos arquivos", "Compilação incremental"],
                correctAnswer: 1,
                explanation: "Cross-compilation gera código para uma plataforma diferente daquela em que o compilador está rodando."
            }
        ]
    };
}

const questionsPool = generateQuestionsFromPDFs();

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========

// Mostrar/ocultar telas
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Alternar entre login e cadastro
function showAuthTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    
    if (tabName === 'login') {
        document.querySelector('.tab-button:nth-child(1)').classList.add('active');
        document.getElementById('login-form').classList.add('active');
        document.getElementById('auth-title').textContent = 'Login';
    } else {
        document.querySelector('.tab-button:nth-child(2)').classList.add('active');
        document.getElementById('register-form').classList.add('active');
        document.getElementById('auth-title').textContent = 'Cadastro';
    }
}

// Mostrar mensagens
function showMessage(message, type) {
    const authMessage = document.getElementById('auth-message');
    authMessage.textContent = message;
    authMessage.className = `message ${type}`;
    
    setTimeout(() => {
        authMessage.textContent = '';
        authMessage.className = 'message';
    }, 5000);
}

// Funcionalidade Mostrar/Ocultar Senha
document.getElementById('toggle-login-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('login-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('toggle-register-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('register-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('toggle-user-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('user-form-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Buscar informações adicionais do usuário
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser = { uid: user.uid, ...userData };
            
            // Redirecionar baseado no tipo de usuário
            if (userData.role === 'admin') {
                showScreen('admin-screen');
                document.getElementById('admin-name').textContent = userData.name;
                loadAdminData();
            } else {
                showScreen('student-screen');
                document.getElementById('user-name').textContent = userData.name;
                loadStudentData();
            }
        }
        
        showMessage('Login realizado com sucesso!', 'success');
    } catch (error) {
        showMessage('Erro no login: ' + error.message, 'error');
    }
});

// Cadastro
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Salvar informações adicionais no Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('Cadastro realizado com sucesso!', 'success');
        
        // Limpar formulário e voltar para login
        document.getElementById('register-form').reset();
        setTimeout(() => showAuthTab('login'), 2000);
    } catch (error) {
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut();
});

document.getElementById('admin-logout-btn').addEventListener('click', () => {
    auth.signOut();
});

// Observador de estado de autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuário está logado
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                currentUser = { uid: user.uid, ...userData };
                
                if (userData.role === 'admin') {
                    showScreen('admin-screen');
                    document.getElementById('admin-name').textContent = userData.name;
                    loadAdminData();
                } else {
                    showScreen('student-screen');
                    document.getElementById('user-name').textContent = userData.name;
                    loadStudentData();
                }
            }
        });
    } else {
        // Usuário não está logado
        showScreen('auth-screen');
        currentUser = null;
    }
});

// ========== FUNÇÕES DO ESTUDANTE ==========

// Carregar dados do estudante
async function loadStudentData() {
    try {
        // Carregar quizzes ativos
        const quizzesSnapshot = await db.collection('quizzes')
            .where('active', '==', true)
            .get();
        
        quizzes = [];
        quizzesSnapshot.forEach(doc => {
            quizzes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Carregar progresso do usuário
        const progressSnapshot = await db.collection('userProgress')
            .where('userId', '==', currentUser.uid)
            .get();
        
        userProgress = [];
        progressSnapshot.forEach(doc => {
            userProgress.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayQuizzes();
        loadRanking();
        displayUserProgress();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Mostrar quizzes para o estudante
function displayQuizzes() {
    const quizzesList = document.getElementById('quizzes-list');
    quizzesList.innerHTML = '';
    
    if (quizzes.length === 0) {
        quizzesList.innerHTML = '<p>Nenhum quiz disponível no momento.</p>';
        return;
    }
    
    quizzes.forEach(quiz => {
        const progress = userProgress.find(p => p.quizId === quiz.id);
        let status = 'not-started';
        let statusText = 'Não Iniciado';
        let buttonText = 'Iniciar Quiz';
        let buttonAction = `startQuiz('${quiz.id}')`;
        
        if (progress) {
            if (progress.completed) {
                status = 'completed';
                statusText = 'Concluído';
                buttonText = 'Ver Resultado';
                buttonAction = `showQuizResults(${JSON.stringify(progress).replace(/'/g, "\\'")})`;
            } else {
                status = 'in-progress';
                statusText = 'Em Andamento';
                buttonText = 'Continuar Quiz';
                buttonAction = `startQuiz('${quiz.id}')`;
            }
        }
        
        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-card';
        quizCard.innerHTML = `
            <h3>${quiz.title}</h3>
            <p>${quiz.description}</p>
            <p><strong>Tópico:</strong> ${getTopicName(quiz.topic)}</p>
            <p><strong>Questões:</strong> ${quiz.questions ? quiz.questions.length : 10}</p>
            <div class="quiz-status status-${status}">${statusText}</div>
            <button onclick="${buttonAction}" class="action-btn" style="margin-top: 1rem;">${buttonText}</button>
        `;
        
        quizzesList.appendChild(quizCard);
    });
}

// Carregar ranking
async function loadRanking() {
    try {
        const rankingSnapshot = await db.collection('userProgress')
            .where('completed', '==', true)
            .orderBy('score', 'desc')
            .orderBy('completedAt', 'asc')
            .limit(50)
            .get();
        
        const rankingList = document.getElementById('ranking-list');
        rankingList.innerHTML = '';
        
        if (rankingSnapshot.empty) {
            rankingList.innerHTML = '<p>Ainda não há dados de ranking.</p>';
            return;
        }
        
        // Agrupar por usuário e pegar melhor pontuação
        const userBestScores = new Map();
        
        rankingSnapshot.forEach(doc => {
            const progress = doc.data();
            if (!userBestScores.has(progress.userId) || userBestScores.get(progress.userId).score < progress.score) {
                userBestScores.set(progress.userId, {
                    score: progress.score,
                    totalQuestions: progress.totalQuestions,
                    completedAt: progress.completedAt,
                    progressId: doc.id
                });
            }
        });
        
        // Ordenar por pontuação
        const sortedRanking = Array.from(userBestScores.entries())
            .sort((a, b) => b[1].score - a[1].score);
        
        let position = 1;
        
        for (const [userId, data] of sortedRanking) {
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                const rankingItem = document.createElement('div');
                rankingItem.className = `ranking-item ${userId === currentUser.uid ? 'current-user' : ''}`;
                
                rankingItem.innerHTML = `
                    <div class="ranking-position">${position}</div>
                    <div class="ranking-name">${userData.name} ${userId === currentUser.uid ? '(Você)' : ''}</div>
                    <div class="ranking-score">${data.score}/${data.totalQuestions}</div>
                    <div class="ranking-percentage">${((data.score / data.totalQuestions) * 100).toFixed(1)}%</div>
                `;
                
                rankingList.appendChild(rankingItem);
                position++;
                
                // Limitar a 20 posições no ranking
                if (position > 20) break;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        document.getElementById('ranking-list').innerHTML = '<p>Erro ao carregar ranking.</p>';
    }
}

// Mostrar progresso do usuário
function displayUserProgress() {
    const userProgressDiv = document.getElementById('user-progress');
    userProgressDiv.innerHTML = '';
    
    const completedQuizzes = userProgress.filter(p => p.completed);
    
    if (completedQuizzes.length === 0) {
        userProgressDiv.innerHTML = '<p>Você ainda não completou nenhum quiz.</p>';
        return;
    }
    
    completedQuizzes.forEach(progress => {
        const quiz = quizzes.find(q => q.id === progress.quizId);
        if (quiz) {
            const progressItem = document.createElement('div');
            progressItem.className = 'quiz-card';
            progressItem.innerHTML = `
                <h3>${quiz.title}</h3>
                <p><strong>Pontuação:</strong> ${progress.score}/${progress.totalQuestions}</p>
                <p><strong>Acertos:</strong> ${progress.score} | <strong>Erros:</strong> ${progress.totalQuestions - progress.score}</p>
                <p><strong>Data de Conclusão:</strong> ${new Date(progress.completedAt.toDate()).toLocaleDateString()}</p>
                <button onclick="showQuizResults(${JSON.stringify(progress).replace(/'/g, "\\'")})" class="action-btn" style="margin-top: 1rem;">Ver Detalhes</button>
            `;
            
            userProgressDiv.appendChild(progressItem);
        }
    });
}

// Alternar entre abas do estudante
function showStudentTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    const tabIndex = ['quizzes', 'ranking', 'progress'].indexOf(tabName) + 1;
    document.querySelector(`.tab-button:nth-child(${tabIndex})`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ========== FUNÇÕES DO QUIZ ==========

// Iniciar quiz
async function startQuiz(quizId) {
    try {
        const quizDoc = await db.collection('quizzes').doc(quizId).get();
        
        if (!quizDoc.exists) {
            alert('Quiz não encontrado!');
            return;
        }
        
        currentQuiz = {
            id: quizDoc.id,
            ...quizDoc.data()
        };
        
        // Se o quiz não tiver questões, usar questões do pool
        if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
            currentQuiz.questions = questionsPool[currentQuiz.topic] || [];
        }
        
        // Verificar progresso existente
        const progressQuery = await db.collection('userProgress')
            .where('userId', '==', currentUser.uid)
            .where('quizId', '==', quizId)
            .get();
        
        if (!progressQuery.empty) {
            const progressDoc = progressQuery.docs[0];
            const progress = progressDoc.data();
            
            if (progress.completed) {
                // Quiz já completado, mostrar resultados
                showQuizResults(progress);
                return;
            } else {
                // Continuar quiz em andamento
                userAnswers = progress.answers || [];
                currentQuestionIndex = progress.currentQuestion || 0;
            }
        } else {
            // Novo quiz
            userAnswers = new Array(currentQuiz.questions.length).fill(null);
            currentQuestionIndex = 0;
            
            // Criar registro de progresso
            await db.collection('userProgress').add({
                userId: currentUser.uid,
                quizId: quizId,
                answers: userAnswers,
                currentQuestion: currentQuestionIndex,
                completed: false,
                startedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        quizStartTime = new Date();
        showScreen('quiz-screen');
        displayQuestion();
        
        // Iniciar timer se houver limite de tempo
        if (currentQuiz.timeLimit) {
            startTimer(currentQuiz.timeLimit);
        }
    } catch (error) {
        console.error('Erro ao iniciar quiz:', error);
        alert('Erro ao carregar o quiz. Tente novamente.');
    }
}

// Mostrar questão atual
function displayQuestion() {
    if (!currentQuiz || !currentQuiz.questions) return;
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const quizTitle = document.getElementById('quiz-title');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const quizProgress = document.getElementById('quiz-progress');
    
    quizTitle.textContent = currentQuiz.title;
    questionText.textContent = `${currentQuestionIndex + 1}. ${question.text}`;
    quizProgress.textContent = `Questão ${currentQuestionIndex + 1} de ${currentQuiz.questions.length}`;
    
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = `option ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}`;
        optionElement.textContent = option;
        optionElement.onclick = () => selectOption(index);
        optionsContainer.appendChild(optionElement);
    });
    
    // Configurar navegação
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    document.getElementById('next-btn').style.display = currentQuestionIndex < currentQuiz.questions.length - 1 ? 'block' : 'none';
    document.getElementById('submit-quiz-btn').style.display = currentQuestionIndex === currentQuiz.questions.length - 1 ? 'block' : 'none';
}

// Selecionar opção
function selectOption(optionIndex) {
    userAnswers[currentQuestionIndex] = optionIndex;
    
    // Atualizar visualização
    document.querySelectorAll('.option').forEach((option, index) => {
        option.classList.toggle('selected', index === optionIndex);
    });
    
    // Salvar progresso
    saveProgress();
}

// Navegação do quiz
document.getElementById('next-btn').addEventListener('click', () => {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
});

// Sair do quiz
document.getElementById('exit-quiz-btn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja sair? Seu progresso será salvo.')) {
        if (timerInterval) clearInterval(timerInterval);
        showScreen('student-screen');
    }
});

// Finalizar quiz
document.getElementById('submit-quiz-btn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja finalizar o quiz?')) {
        submitQuiz();
    }
});

// Submeter quiz
async function submitQuiz() {
    try {
        // Calcular pontuação
        let score = 0;
        currentQuiz.questions.forEach((question, index) => {
            if (userAnswers[index] === question.correctAnswer) {
                score++;
            }
        });
        
        const progressQuery = await db.collection('userProgress')
            .where('userId', '==', currentUser.uid)
            .where('quizId', '==', currentQuiz.id)
            .get();
        
        if (!progressQuery.empty) {
            const progressDoc = progressQuery.docs[0];
            
            await db.collection('userProgress').doc(progressDoc.id).update({
                answers: userAnswers,
                completed: true,
                score: score,
                totalQuestions: currentQuiz.questions.length,
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        if (timerInterval) clearInterval(timerInterval);
        
        // Mostrar resultados
        showQuizResults({
            score: score,
            totalQuestions: currentQuiz.questions.length,
            answers: userAnswers
        }, currentQuiz);
    } catch (error) {
        console.error('Erro ao submeter quiz:', error);
        alert('Erro ao finalizar o quiz. Tente novamente.');
    }
}

// Mostrar resultados
function showQuizResults(progress, quizDetails = null) {
    showScreen('results-screen');
    
    const scoreDisplay = document.getElementById('score-display');
    const quizFeedback = document.getElementById('quiz-feedback');
    
    const percentage = (progress.score / progress.totalQuestions) * 100;
    scoreDisplay.textContent = `${progress.score}/${progress.totalQuestions} (${percentage.toFixed(1)}%)`;
    
    let feedback = '';
    if (percentage >= 90) {
        feedback = 'Excelente! Você dominou completamente este conteúdo!';
        scoreDisplay.style.color = '#27ae60';
    } else if (percentage >= 70) {
        feedback = 'Muito bom! Você tem um bom domínio do conteúdo.';
        scoreDisplay.style.color = '#f39c12';
    } else if (percentage >= 50) {
        feedback = 'Bom trabalho! Continue estudando para melhorar seu desempenho.';
        scoreDisplay.style.color = '#f39c12';
    } else {
        feedback = 'Não desanime! Revise o material e tente novamente.';
        scoreDisplay.style.color = '#e74c3c';
    }
    
    // Mostrar detalhes das questões
    let questionsDetails = '';
    if (quizDetails && quizDetails.questions) {
        questionsDetails = '<div class="questions-review">';
        questionsDetails += '<h3>Revisão das Questões:</h3>';
        
        quizDetails.questions.forEach((question, index) => {
            const userAnswer = progress.answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            const isAnswered = userAnswer !== null;
            
            questionsDetails += `
                <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}">
                    <p><strong>Questão ${index + 1}:</strong> ${question.text}</p>
                    <p><strong>Sua resposta:</strong> ${isAnswered ? question.options[userAnswer] : 'Não respondida'} ${isCorrect ? '✅' : '❌'}</p>
                    ${!isCorrect ? `<p><strong>Resposta correta:</strong> ${question.options[question.correctAnswer]}</p>` : ''}
                    <p><strong>Explicação:</strong> ${question.explanation}</p>
                </div>
            `;
        });
        
        questionsDetails += '</div>';
    }
    
    quizFeedback.innerHTML = `
        <p>${feedback}</p>
        <p><strong>Acertos:</strong> ${progress.score} | <strong>Erros:</strong> ${progress.totalQuestions - progress.score}</p>
        <p><strong>Tempo gasto:</strong> ${calculateTimeSpent()}</p>
        ${questionsDetails}
    `;
    
    // Configurar botões de ação
    document.getElementById('back-to-quizzes-btn').onclick = () => {
        showScreen('student-screen');
        loadStudentData();
    };
    
    document.getElementById('review-quiz-btn').onclick = () => {
        // Rolar para a seção de revisão
        const reviewSection = document.querySelector('.questions-review');
        if (reviewSection) {
            reviewSection.scrollIntoView({ behavior: 'smooth' });
        }
    };
}

// Salvar progresso
async function saveProgress() {
    try {
        const progressQuery = await db.collection('userProgress')
            .where('userId', '==', currentUser.uid)
            .where('quizId', '==', currentQuiz.id)
            .get();
        
        if (!progressQuery.empty) {
            const progressDoc = progressQuery.docs[0];
            
            await db.collection('userProgress').doc(progressDoc.id).update({
                answers: userAnswers,
                currentQuestion: currentQuestionIndex
            });
        }
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

// Timer
function startTimer(minutes) {
    let timeLeft = minutes * 60;
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'quiz-timer';
    
    document.getElementById('quiz-screen').appendChild(timerDisplay);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        
        const minutesLeft = Math.floor(timeLeft / 60);
        const secondsLeft = timeLeft % 60;
        
        timerDisplay.textContent = `Tempo: ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('Tempo esgotado!');
            submitQuiz();
        }
    }, 1000);
}

// Calcular tempo gasto
function calculateTimeSpent() {
    if (!quizStartTime) return 'N/A';
    
    const endTime = new Date();
    const timeDiff = endTime - quizStartTime;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
}

// ========== FUNÇÕES DO ADMINISTRADOR ==========

// Carregar dados do administrador
async function loadAdminData() {
    try {
        // Carregar usuários
        const usersSnapshot = await db.collection('users').get();
        allUsers = [];
        usersSnapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Carregar quizzes
        const quizzesSnapshot = await db.collection('quizzes').get();
        allQuizzes = [];
        quizzesSnapshot.forEach(doc => {
            allQuizzes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Verificar se é o primeiro administrador
        const adminUsers = allUsers.filter(u => u.role === 'admin');
        const isFirstAdmin = adminUsers.length === 1 && adminUsers[0].id === currentUser.uid;
        
        // Mostrar/ocultar opção de administrador no modal
        const adminOption = document.getElementById('admin-option');
        if (adminOption) {
            adminOption.style.display = isFirstAdmin ? 'block' : 'none';
        }
        
        displayUsers();
        displayQuizzesAdmin();
        loadAdminStats();
    } catch (error) {
        console.error('Erro ao carregar dados administrativos:', error);
    }
}

// Mostrar usuários
function displayUsers() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    allUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'admin-item';
        userItem.innerHTML = `
            <div>
                <strong>${user.name}</strong>
                <br>
                <small>${user.email} | ${user.role === 'admin' ? 'Administrador' : 'Aluno'}</small>
            </div>
            <div class="admin-actions">
                <button onclick="editUser('${user.id}')" class="action-btn">Editar</button>
                ${user.id !== currentUser.uid ? `<button onclick="deleteUser('${user.id}')" class="delete-btn">Excluir</button>` : ''}
            </div>
        `;
        
        usersList.appendChild(userItem);
    });
}

// Mostrar quizzes (admin)
function displayQuizzesAdmin() {
    const quizzesList = document.getElementById('quizzes-admin-list');
    quizzesList.innerHTML = '';
    
    allQuizzes.forEach(quiz => {
        const quizItem = document.createElement('div');
        quizItem.className = 'admin-item';
        quizItem.innerHTML = `
            <div>
                <strong>${quiz.title}</strong>
                <br>
                <small>${getTopicName(quiz.topic)} | ${quiz.questions ? quiz.questions.length : 10} questões | ${quiz.active ? 'Ativo' : 'Inativo'}</small>
            </div>
            <div class="admin-actions">
                <button onclick="editQuiz('${quiz.id}')" class="action-btn">Editar</button>
                <button onclick="toggleQuizStatus('${quiz.id}', ${!quiz.active})" class="action-btn">
                    ${quiz.active ? 'Desativar' : 'Ativar'}
                </button>
                <button onclick="deleteQuiz('${quiz.id}')" class="delete-btn">Excluir</button>
            </div>
        `;
        
        quizzesList.appendChild(quizItem);
    });
}

// Carregar estatísticas
async function loadAdminStats() {
    try {
        const statsContainer = document.getElementById('admin-stats');
        
        // Estatísticas de usuários
        const totalUsers = allUsers.length;
        const adminUsers = allUsers.filter(u => u.role === 'admin').length;
        const studentUsers = totalUsers - adminUsers;
        
        // Estatísticas de quizzes
        const totalQuizzes = allQuizzes.length;
        const activeQuizzes = allQuizzes.filter(q => q.active).length;
        
        // Estatísticas de progresso
        const progressSnapshot = await db.collection('userProgress')
            .where('completed', '==', true)
            .get();
        
        const completedQuizzes = progressSnapshot.size;
        let totalScore = 0;
        let totalQuestions = 0;
        
        progressSnapshot.forEach(doc => {
            const progress = doc.data();
            totalScore += progress.score;
            totalQuestions += progress.totalQuestions;
        });
        
        const averageScore = completedQuizzes > 0 ? (totalScore / completedQuizzes).toFixed(1) : 0;
        const averagePercentage = totalQuestions > 0 ? ((totalScore / totalQuestions) * 100).toFixed(1) : 0;
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Usuários</h3>
                    <p class="stat-number">${totalUsers}</p>
                    <p>${adminUsers} administradores</p>
                    <p>${studentUsers} alunos</p>
                </div>
                <div class="stat-card">
                    <h3>Quizzes</h3>
                    <p class="stat-number">${totalQuizzes}</p>
                    <p>${activeQuizzes} ativos</p>
                    <p>${totalQuizzes - activeQuizzes} inativos</p>
                </div>
                <div class="stat-card">
                    <h3>Desempenho</h3>
                    <p class="stat-number">${completedQuizzes}</p>
                    <p>quizzes completados</p>
                    <p>Pontuação média: ${averageScore}</p>
                    <p>Taxa de acerto: ${averagePercentage}%</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Alternar entre abas do admin
function showAdminTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    const tabIndex = ['users', 'quizzes-admin', 'stats'].indexOf(tabName) + 1;
    document.querySelector(`.tab-button:nth-child(${tabIndex})`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Gerenciar usuários
document.getElementById('add-user-btn').addEventListener('click', () => {
    showUserModal();
});

function showUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    
    if (userId) {
        // Modo edição
        title.textContent = 'Editar Usuário';
        const user = allUsers.find(u => u.id === userId);
        
        document.getElementById('user-form-name').value = user.name;
        document.getElementById('user-form-email').value = user.email;
        document.getElementById('user-form-role').value = user.role;
        document.getElementById('user-form-password').value = '';
        document.getElementById('user-form-password').required = false;
        
        form.onsubmit = (e) => updateUser(e, userId);
    } else {
        // Modo adição
        title.textContent = 'Adicionar Usuário';
        form.reset();
        document.getElementById('user-form-password').required = true;
        form.onsubmit = addUser;
    }
    
    modal.classList.add('active');
}

document.getElementById('cancel-user-btn').addEventListener('click', () => {
    document.getElementById('user-modal').classList.remove('active');
});

async function addUser(e) {
    e.preventDefault();
    
    const name = document.getElementById('user-form-name').value;
    const email = document.getElementById('user-form-email').value;
    const password = document.getElementById('user-form-password').value;
    const role = document.getElementById('user-form-role').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('user-modal').classList.remove('active');
        loadAdminData();
        alert('Usuário adicionado com sucesso!');
    } catch (error) {
        alert('Erro ao adicionar usuário: ' + error.message);
    }
}

async function updateUser(e, userId) {
    e.preventDefault();
    
    const name = document.getElementById('user-form-name').value;
    const email = document.getElementById('user-form-email').value;
    const password = document.getElementById('user-form-password').value;
    const role = document.getElementById('user-form-role').value;
    
    try {
        const updateData = {
            name: name,
            email: email,
            role: role
        };
        
        // Se uma nova senha foi fornecida, atualizar no Auth
        if (password) {
            // Em produção, seria necessário implementar reautenticação
            alert('Para alterar senhas, o usuário deve fazer isso através da funcionalidade de redefinição de senha.');
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        document.getElementById('user-modal').classList.remove('active');
        loadAdminData();
        alert('Usuário atualizado com sucesso!');
    } catch (error) {
        alert('Erro ao atualizar usuário: ' + error.message);
    }
}

function editUser(userId) {
    showUserModal(userId);
}

async function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        try {
            await db.collection('users').doc(userId).delete();
            loadAdminData();
            alert('Usuário excluído com sucesso!');
        } catch (error) {
            alert('Erro ao excluir usuário: ' + error.message);
        }
    }
}

// Gerenciar quizzes
document.getElementById('add-quiz-btn').addEventListener('click', () => {
    showQuizModal();
});

function showQuizModal(quizId = null) {
    const modal = document.getElementById('quiz-modal');
    const title = document.getElementById('quiz-modal-title');
    const form = document.getElementById('quiz-form');
    
    if (quizId) {
        // Modo edição
        title.textContent = 'Editar Quiz';
        const quiz = allQuizzes.find(q => q.id === quizId);
        
        document.getElementById('quiz-form-title').value = quiz.title;
        document.getElementById('quiz-form-description').value = quiz.description;
        document.getElementById('quiz-form-topic').value = quiz.topic;
        document.getElementById('quiz-form-time').value = quiz.timeLimit || '';
        
        form.onsubmit = (e) => updateQuiz(e, quizId);
    } else {
        // Modo adição
        title.textContent = 'Criar Quiz';
        form.reset();
        form.onsubmit = addQuiz;
    }
    
    modal.classList.add('active');
}

document.getElementById('cancel-quiz-btn').addEventListener('click', () => {
    document.getElementById('quiz-modal').classList.remove('active');
});

async function addQuiz(e) {
    e.preventDefault();
    
    const title = document.getElementById('quiz-form-title').value;
    const description = document.getElementById('quiz-form-description').value;
    const topic = document.getElementById('quiz-form-topic').value;
    const timeLimit = document.getElementById('quiz-form-time').value;
    
    try {
        await db.collection('quizzes').add({
            title: title,
            description: description,
            topic: topic,
            timeLimit: timeLimit ? parseInt(timeLimit) : null,
            questions: questionsPool[topic] || [],
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('quiz-modal').classList.remove('active');
        loadAdminData();
        alert('Quiz criado com sucesso!');
    } catch (error) {
        alert('Erro ao criar quiz: ' + error.message);
    }
}

async function updateQuiz(e, quizId) {
    e.preventDefault();
    
    const title = document.getElementById('quiz-form-title').value;
    const description = document.getElementById('quiz-form-description').value;
    const topic = document.getElementById('quiz-form-topic').value;
    const timeLimit = document.getElementById('quiz-form-time').value;
    
    try {
        await db.collection('quizzes').doc(quizId).update({
            title: title,
            description: description,
            topic: topic,
            timeLimit: timeLimit ? parseInt(timeLimit) : null
        });
        
        document.getElementById('quiz-modal').classList.remove('active');
        loadAdminData();
        alert('Quiz atualizado com sucesso!');
    } catch (error) {
        alert('Erro ao atualizar quiz: ' + error.message);
    }
}

function editQuiz(quizId) {
    showQuizModal(quizId);
}

async function toggleQuizStatus(quizId, active) {
    try {
        await db.collection('quizzes').doc(quizId).update({
            active: active
        });
        
        loadAdminData();
        alert(`Quiz ${active ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
        alert('Erro ao alterar status do quiz: ' + error.message);
    }
}

async function deleteQuiz(quizId) {
    if (confirm('Tem certeza que deseja excluir este quiz? Esta ação não pode ser desfeita.')) {
        try {
            await db.collection('quizzes').doc(quizId).delete();
            loadAdminData();
            alert('Quiz excluído com sucesso!');
        } catch (error) {
            alert('Erro ao excluir quiz: ' + error.message);
        }
    }
}

// ========== FUNÇÕES UTILITÁRIAS ==========

function getTopicName(topic) {
    const topics = {
        'base-binaria': 'Base Binária, Octal, Decimal e Hexadecimal',
        'historia-computadores': 'História dos Computadores',
        'arquitetura-von-neumann': 'Arquitetura de John Von Neumann',
        'componentes-computador': 'Componentes de um Computador',
        'instrucoes-maquina': 'Instruções de Máquina',
        'traducao-instrucoes': 'Tradução de Instruções de Máquina'
    };
    
    return topics[topic] || topic;
}

// Inicializar a aplicação
console.log('Sistema de Quiz de Fundamentos da Informática inicializado!');
