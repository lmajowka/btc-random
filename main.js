import ranges from './ranges.js'
import encontrarBitcoins from './bitcoin-find.js'
import readline from 'readline'
import chalk from 'chalk'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let shouldStop = false;



let key = 0;
let min, max = 0;

console.clear();

console.log("\x1b[38;2;250;128;114m" + "╔════════════════════════════════════════════════════════╗\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "   ____ _____ ____   _____ ___ _   _ ____  _____ ____   " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  | __ )_   _/ ___| |  ___|_ _| \\ | |  _ \\| ____|  _ \\  " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  |  _ \\ | || |     | |_   | ||  \\| | | | |  _| | |_) | " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  | |_) || || |___  |  _|  | || |\\  | |_| | |___|  _ <  " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  |____/ |_| \\____| |_|   |___|_| \\_|____/|_____|_| \\_\\ " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "                                                        " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "╚══════════════════════\x1b[32m" + "Investidor Internacional - v0.4r" + "\x1b[0m\x1b[38;2;250;128;114m══╝" + "\x1b[0m");

rl.question(`Escolha uma carteira puzzle( ${chalk.cyan(1)} - ${chalk.cyan(160)}): `, (answer) => {
    
    if (parseInt(answer) < 1 || parseInt(answer) > 161) {
        console.log(chalk.bgRed('Erro: voce precisa escolher um numero entre 1 e 160'))
    }

    min = ranges[answer-1].min
    max = ranges[answer-1].max
    console.log('Carteira escolhida: ', chalk.cyan(answer), ' Min: ', chalk.yellow(min), ' Max: ', chalk.yellow(max) )
    console.log('Numero possivel de chaves:',  chalk.yellow(parseInt(BigInt(max) - BigInt(min)).toLocaleString('pt-BR')))
    let status = ''
    if (ranges[answer-1].status == 1){
        status =  chalk.red('Encontrada')
    } else  {
        status =  chalk.green('Nao Encontrada')
    }

    console.log('Status: ', status)
    key = BigInt(min)
    
    rl.question(`Escolha uma opcao (${chalk.cyan(1)} - Estou sorte, ${chalk.cyan(2)} - Estou com sorte mas quero influencia-la ):`, (answer2) => {
        if (answer2 == '2'){
            rl.question('Escolha um numero entre 0 e 1.000.000.000: ', (answer3) => {
                min = BigInt(min);
                max = BigInt(max);  
                key = BigInt(min)
                encontrarBitcoins(key, min, max, () => shouldStop,answer3)
                rl.close();
            });
        } else {
            min = BigInt(min);
            max = BigInt(max);
            key = BigInt(min)
            encontrarBitcoins(key, min, max, () => shouldStop)
            rl.close();
        }
    })
});

rl.on('SIGINT', () => {
    shouldStop = true;
    rl.close();
    process.exit();
});

process.on('SIGINT', () => {
    shouldStop = true;
    rl.close();
    process.exit();
});