const cursor = document.querySelector('.cursor')
const holes = [...document.querySelectorAll('.hole')]
const scoreEl = document.querySelector('.score span')
const timerLabel = document.getElementById('time-left')
let timeLeft = 10
let score = 0


const sound = new Audio("assets/smash.mp3")

function run(){
    const i = Math.floor(Math.random() * holes.length)
    const hole = holes[i]
    let timer = null

    updateTimer();

    const img = document.createElement('img')
    img.classList.add('mole')
    img.src = 'assets/mole.png'
    

    img.addEventListener('click', () => {
        score += 10
        sound.play()
        scoreEl.textContent = score
        img.src = 'assets/mole-whacked.png'
        clearTimeout(timer)
        setTimeout(() => {
            hole.removeChild(img)
            run();
        }, 500)
        timeLeft += 2; 
    

    })
    
    hole.appendChild(img)

    timer = setTimeout(() => {
        hole.removeChild(img)
        run()
    }, 1500)
}
function updateTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        timerLabel.textContent = timeLeft.toString();
    } else {
       // clearInterval(countdown);
       if(timeLeft==0) {

       
        showGameOverScreen();
    }
   }
    
}
function showGameOverScreen() {
    var gameOverScreen = document.getElementById("game-over-screen");
    gameOverScreen.style.display = "block";
    var gameboard=document.getElementById("BOARD");
    gameboard.style.display = "none";
    var sekor=document.getElementById("score");
    sekor.style.display = "none";
    var taime=document.getElementById("timee");
    taime.style.display = "none";

 }
 function restartGame() {
    window.location.href = "startscreen.html";
 }
 
function startGame() {
    window.location.href = "index.html";
}
run()


window.addEventListener('mousemove', e => {
    cursor.style.top = e.pageY + 'px'
    cursor.style.left = e.pageX + 'px'
})
window.addEventListener('mousedown', () => {
    cursor.classList.add('active')
})
window.addEventListener('mouseup', () => {
    cursor.classList.remove('active')
})
