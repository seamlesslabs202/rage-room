// CONNECT TO THE CLIENT SERVER
const SUPABASE_URL = "https://iooaevzzyxhgrouymwyy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MC9IlztWUNt1yw0Qvahs6A_hqCUptAY";

console.log("Supabase library:", window.supabase);

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Supabase client created:", !!supabaseClient);

const ventSenderId = crypto.randomUUID();

const ventChannel = supabaseClient
    .channel("public-vent-wall")
    .on(
        "broadcast",
        { event: "vent-message" },
        ({ payload }) => {
            if (typeof payload?.text !== "string") return;

            console.log("Message received from The Void:", payload);

            // Don't display your own message twice.
            if (payload.senderId === ventSenderId) return;

            displayLiveVentMessage(payload.text);
        }
    )
    .subscribe((status, err) => {
        console.log("The Void channel status:", status);

        if (err) {
            console.error("The Void subscription error:", err);
        }
    });

let liveVentMode = false;

// CANVAS SETUP
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// CURRENT PAGE
let currentPage = 1;

let writingFading = false;
let writingFadeOpacity = 1;

// DONATE
const donateButton = document.getElementById("donateButton");

// VENTING OPTION
let selectedVent = null;

let fadeOpacity = 0;
let fading = false;
let fadeDirection = 0;
let nextPage = null;

// LET GO
let letGoStartTime = null;
let letGoStarted = false;

const breathingPhases = [
    { name: "Breathe in", duration: 6 },
    { name: "Hold", duration: 4 },
    { name: "Breathe out", duration: 6 },
    { name: "Rest", duration: 6 }
];

const breathingCycleDuration = 22;

// DOOR
let doorX = 0;
let doorY = 0;
let doorWidth = 260;
let doorHeight = 420;
let doorHovered = false;

let showEntranceHit = true;

// DESK POSITION
const DESK_OFFSET_X = -80;

// MOUSE VARIABLES
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

// HAMMER VARIABLES
const HAMMER_REST_ANGLE = -Math.PI * 0.25;
const HAMMER_STRIKE_ANGLE = -Math.PI * 0.5;

let hammerAngle = HAMMER_REST_ANGLE;

let hammerSwinging = false;
let hammerReturning = false;

// SCREEN SHAKE
let screenShake = 0;
let screenShakeTimer = 0;

// SMASH VARIABLES
const smashedObjects = new Set();
const debris = [];
const particles = [];
const hitCounts = new Map();
let hitAgainText = "";
let hitAgainOpacity = 0;
let hitAgainTimer = 0;

// FIREWORKS VARIABLES
const fireworks = [];
let celebrationStarted = false;
let legendTextOpacity = 0;

// FIREWORK AUDIO
const fireworkAudio = new Audio("audio/explosion.mp3");
fireworkAudio.volume = 0.8;

// SCREAM PAGE 
const feelingsBox = document.getElementById("feelingsBox");

// SCREAM PAGE BACKGROUND
const screamBackground = new Image();
screamBackground.src = "images/scream-bg.jpg";

// SCREAM BUTTON
const screamButtonImage = new Image();
screamButtonImage.src = "images/screambutton.png";

// SCREAM AUDIO
const screamAudio = new Audio("audio/scream.mp3");

// AFTER SCREAM MESSAGE 
const afterScreamMessage = document.createElement("div");
afterScreamMessage.className = "after-scream-message";
afterScreamMessage.textContent = "Let's pretend that was normal.";
document.body.appendChild(afterScreamMessage);

// SCREAM AGAIN
let screamAgainMode = false;
const screamAgainLink = document.getElementById("scream-again-link");

// VENT SPACE SELECTION 
const ventRoomSelection = document.getElementById("ventRoomSelection");
const privateVentCard = document.getElementById("privateVentCard");
const liveVentCard = document.getElementById("liveVentCard");
const ventRoomNotice = document.getElementById("ventRoomNotice");
let ventRoomChosen = false;

// VENT VARIABLES
const ventBox = document.getElementById("ventBox");
const ventMessageElement = document.getElementById("ventMessage");
let ventMessageTimeout;
let ventMessage = "";

// PAGE TIMEOUTS
let animationFrameId = null;

// ==================================================
// RESIZE CANVAS
// ==================================================

function resizeCanvas() {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener(
    "resize",
    resizeCanvas
);

resizeCanvas();

// ==================================================
// MOUSE EVENTS
// ==================================================

canvas.addEventListener("mousemove", (event) => {

    const rect = canvas.getBoundingClientRect();

    mouseX =
        (event.clientX - rect.left) *
        (canvas.width / rect.width);

    mouseY =
        (event.clientY - rect.top) *
        (canvas.height / rect.height);

    if (currentPage === 3) {

        if (
            mouseX >= doorX &&
            mouseX <= doorX + doorWidth &&
            mouseY >= doorY &&
            mouseY <= doorY + doorHeight
        ) {
            doorHovered = true;
            canvas.style.cursor = "pointer";
        } else {
            doorHovered = false;
            canvas.style.cursor = "default";
        }

    } else if (currentPage === 3) {

        const buttonX = canvas.width / 2 - 175;
        const buttonY = 350;
        const buttonWidth = 350;
        const buttonHeight = 200;

            if (
                mouseX >= buttonX &&
                mouseX <= buttonX + buttonWidth &&
                mouseY >= buttonY &&
                mouseY <= buttonY + buttonHeight
            ) 
        {
            canvas.style.cursor = "pointer";
        }

    } else {
        canvas.style.cursor = "default";
    }
});

canvas.addEventListener("mousedown", () => {

    if (fading) return;

    // PAGE 1 → PAGE 2
    if (currentPage === 1) {
        startPageTransition(2);
        return;
    }
    
    // PAGE 2 → selected vent
    if (currentPage === 2) {

        const cardWidth = 240;
        const cardHeight = 140;
        const gap = 20;

        const options = [
            "smash",
            "scream",
            "vent",
            //"bury",
            "letgo"
        ];

        const totalWidth =
            options.length * cardWidth +
            (options.length - 1) * gap;

        const startX =
            (canvas.width - totalWidth) / 2;

        const y =
            canvas.height / 2 - 40;

        options.forEach((option, index) => {

            const x =
                startX +
                index * (cardWidth + gap);

            if (
                mouseX >= x &&
                mouseX <= x + cardWidth &&
                mouseY >= y &&
                mouseY <= y + cardHeight
            ) {

                selectedVent = option;
                console.log("Selected option:", selectedVent);
                console.log("Current page:", currentPage);

                if (option === "smash") {
                startPageTransition(3);
                }

                if (option === "scream") {
                    startPageTransition(5);
                }

                if (option === "vent") {
                    startPageTransition(6);
                }

            }

        });

        return;
    }

    // PAGE 3 → PAGE 4
    if (currentPage === 3) {

        const doorWidth = 260;
        const doorHeight = 420;

        const doorX =
            canvas.width / 2 - doorWidth / 2;

        const doorY =
            canvas.height / 2 - doorHeight / 2;

        if (
            mouseX >= doorX &&
            mouseX <= doorX + doorWidth &&
            mouseY >= doorY &&
            mouseY <= doorY + doorHeight
        ) {
            startPageTransition(4);
        }

        return;
    }

    // PAGE 4 — HAMMER
    if (currentPage === 4) {

        if (hammerSwinging) return;

        hammerSwinging = true;
        hammerReturning = false;
    }

    // PAGE 5 — SCREAM BUTTON
    if (currentPage === 5) {

        const buttonX = canvas.width / 2 - 175;
        const buttonY = 350;
        const buttonWidth = 350;
        const buttonHeight = 200;

        if (
            mouseX >= buttonX &&
            mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY &&
            mouseY <= buttonY + buttonHeight
        )  {

                const feelings = feelingsBox.value.trim();

                if (feelings.length > 0) {

                    // Prevent repeated clicks
                    if (feelingsBox.classList.contains("feelings-disappear")) {
                            return;
                    }

                        // Fade and shrink the feelings box
                    feelingsBox.classList.add("feelings-disappear");

                    feelingsBox.addEventListener("animationend", function onDisappear(event) {
                                    if (event.animationName !== "dissolveIntoDark") return;

                                    // Hide the feelings box
                                    feelingsBox.style.display = "none";

                                    // Show the message in the feelings box's position
                                    afterScreamMessage.classList.add("show-message");
                                    afterScreamMessage.style.display = "block";

                                    // Hide the scream button
                                    screamButtonImage.style.display = "none";

                                    // Show "Let's scream again!" in the button's position
                                    const screamAgainMessage =
                                        document.getElementById("scream-again-message");

                                    if (screamAgainMessage) {
                                        screamAgainMessage.style.display = "block";
                                    }

                                    screamAgainMode = true;

                                    feelingsBox.removeEventListener("animationend", onDisappear);
                    });

                        // Play the scream audio
                        screamAudio.currentTime = 0;
                        screamAudio.play();
                }
            }
        return;
    }

});

canvas.addEventListener("click", (event) => {

    if (currentPage !== 2) return;

    const cardWidth = 240;
    const cardHeight = 165;
    const gap = 20;

    const optionsCount = 5;

    const totalWidth =
        optionsCount * cardWidth +
        (optionsCount - 1) * gap;

    const startX =
        (canvas.width - totalWidth) / 2;

    const y =
        canvas.height / 2 - 55;

    // SCREAM = option index 2
    const screamX =
        startX + 2 * (cardWidth + gap);

    // LET IT GO = option index 4
    const letGoX =
        startX + 4 * (cardWidth + gap);

    // SCREAM click
    if (
        mouseX >= screamX &&
        mouseX <= screamX + cardWidth &&
        mouseY >= y &&
        mouseY <= y + cardHeight
    ) {
        startPageTransition(5);
        return;
    }

    // LET IT GO click
    if (
    mouseX >= letGoX &&
    mouseX <= letGoX + cardWidth &&
    mouseY >= y &&
    mouseY <= y + cardHeight
    ) {
        letGoStartTime = null;
        startPageTransition(7);
        return;
    }

});

// feelingsBox.addEventListener("keydown", (event) => {

//     if (event.key !== "Enter" || currentPage !== 5) return;

//     event.preventDefault();
//     screamButtonImage.click(); 
// });

feelingsBox.addEventListener("keydown", (event) => {

    if (event.key !== "Enter" || currentPage !== 5) return;

    event.preventDefault();

    const buttonX = canvas.width / 2 - 175;
    const buttonY = 350;

    mouseX = buttonX + 175;
    mouseY = buttonY + 100;

    canvas.dispatchEvent(new MouseEvent("mousedown"));

});

screamAgainLink.addEventListener("click", () => {

    screamAgainMode = false;

    document.getElementById("scream-again-message").style.display = "none";
    afterScreamMessage.style.display = "none";

    screamButtonImage.style.display = "block";

    feelingsBox.classList.remove("feelings-disappear");
    feelingsBox.style.display = "block";
    feelingsBox.value = "";
});

ventBox.addEventListener("keydown", (event) => {

    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();

   const text = ventBox.value.trim();
    if (!text) return;

    if (liveVentMode && text.length > 300) {
        console.log("Live messages are limited to 300 characters.");
        return;
    }

    ventBox.value = "";
    
    // LIVE VENT CHAT
    if (liveVentMode) {
        if (text.length > 300) {
            console.log("Live messages are limited to 300 characters.");
            return;
        }

        displayLiveVentMessage(text);

        ventChannel.send({
            type: "broadcast",
            event: "vent-message",
            payload: {
                text: text,
                senderId: ventSenderId
            }
        });

        return;
    }

    clearTimeout(ventMessageTimeout);

    // Remove the previous animation
    ventMessageElement.classList.remove("show");

    // Insert the new message
    ventMessageElement.textContent = text;
    
    // // VENT MESSAGE COLOR
    // const pastelColor =
    //     `hsl(${Math.random() * 360}, 70%, 80%)`;

    // ventMessageElement.style.color = pastelColor;

    const randomColor =
        `hsl(${Math.random() * 360}, 85%, 75%)`;

    ventMessageElement.style.color = randomColor;

    ventMessageElement.style.display = "block";

    // Set the message width relative to the canvas
    ventMessageElement.style.width =
        canvas.clientWidth * 0.7 + "px";

    // Measure the message after making it visible
    const messageWidth = ventMessageElement.offsetWidth;
    const messageHeight = ventMessageElement.offsetHeight;

    // Choose a random position that keeps the message on the canvas
    const randomX =
        Math.random() * (canvas.clientWidth - messageWidth) +
        messageWidth / 2;

    const ventBoxTop =
    ventBox.getBoundingClientRect().top - canvas.getBoundingClientRect().top;

    const randomY =
        Math.random() * (ventBoxTop - messageHeight) +
        messageHeight / 2;

    // Position the message relative to the canvas
    ventMessageElement.style.left =
        canvas.offsetLeft + randomX + "px";

    ventMessageElement.style.top =
        canvas.offsetTop + randomY + "px";

    // Restart the fade animation
    void ventMessageElement.offsetWidth;
    ventMessageElement.classList.add("show");

    // Remove the message after 8 seconds
    ventMessageTimeout = setTimeout(() => {
        ventMessageElement.classList.remove("show");
        ventMessageElement.style.display = "none";
        ventMessageElement.textContent = "";
    }, 8000);
});

privateVentCard.addEventListener("click", () => {

    ventRoomChosen = true;

    ventRoomSelection.style.display = "none";

    ventBox.value = "";
    ventBox.style.display = "block";

    ventRoomNotice.textContent = "";

});

liveVentCard.addEventListener("click", () => {
    liveVentMode = true;
    ventRoomChosen = true;

    ventRoomSelection.style.display = "none";
    ventBox.value = "";
    ventBox.style.display = "block";
    ventRoomNotice.textContent = "";
});

// ==================================================
// HELPERS
// ==================================================

function random(min, max) {

    return Math.random() *
        (max - min) +
        min;
}

function lerp(a, b, amount) {

    return a +
        (b - a) *
        amount;
}

function isSmashed(id) {

    return smashedObjects.has(id);
}

// PAGE TRANSITION
function startPageTransition(page) {

    if (fading) return;

    nextPage = page;
    fading = true;
    fadeDirection = 1;
}

// ==================================================
// PAGE CONTROLLER
// ==================================================

function pageController() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // DONATE — visible on every page except page 1
    donateButton.style.display =
    currentPage !== 1 ? "inline-block" : "none";

    if (currentPage === 1) {

        console.log("Page 1");
        drawLandingPage();

    } else if (currentPage === 2) {

        console.log("Page 2");
        drawChooseVentPage();

    } else if (currentPage === 3) {

        console.log("Page 3");
        drawOfficeDoorPage();

    } else if (currentPage === 4) {
        
        console.log("Page 4");
        ctx.save();

        if (screenShakeTimer > 0) {

            screenShakeTimer -= 16;

            const shakeProgress =
                Math.max(screenShakeTimer / 2400, 0);

            const currentShake =
                screenShake * shakeProgress;

            ctx.translate(
                random(-currentShake, currentShake),
                random(-currentShake, currentShake)
            );

        } else {

            screenShake = 0;
            screenShakeTimer = 0;
        }

        if (!celebrationStarted) {

            drawRoom();
            drawEntranceHit();
            drawDebris();
            drawParticles();
            drawHammer(mouseX, mouseY);
            drawHitAgainText();

        } else {

            ctx.fillStyle = "#03050c";

            ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            drawFireworks();
            drawLegendText();
        }

        ctx.restore();

    } else if (currentPage === 5) {

        console.log("Page 5");
        drawScreamPage();

    } else if (currentPage === 6) {

        console.log("Page 6");
        drawVentPage();
        
    } else if (currentPage === 7) {

        console.log("Page 7");
        drawLetItGoPage();
    }
    
    // FADE TRANSITION
    if (fading) {

        if (fadeDirection === 1) {

            fadeOpacity += 0.035;

            if (fadeOpacity >= 1) {

                fadeOpacity = 1;

                currentPage = nextPage;

                fadeDirection = -1;
            }

        } else {

            fadeOpacity -= 0.035;

            if (fadeOpacity <= 0) {

                fadeOpacity = 0;
                fading = false;
                fadeDirection = 0;
            }
        }

        ctx.fillStyle =
            `rgba(0, 0, 0, ${fadeOpacity})`;

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }
}

// ==================================================
// PAGE 1 — LANDING PAGE
// ==================================================

function drawLandingPage() {

    // Dark room
    ctx.fillStyle = "#111318";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Title
    ctx.save();

    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#ffffff";
    ctx.font =
    "bold 42px Arial";
    ctx.fillText(
        "WELCOME TO THE RAGE ROOM",
        canvas.width / 2,
        200
    );

    // SUBTITLE
    ctx.fillStyle = "#bfc4cc";
    ctx.font =
        "20px Arial";
    ctx.fillText(
        "You've had a long day. Vent it out",
        canvas.width / 2,
        260
    );

    ctx.restore();

}

// ==================================================
// PAGE 2 — CHOOSE YOUR WAY TO VENT
// ==================================================

function drawChooseVentPage() {

    // BACKGROUND
    ctx.fillStyle = "#111318";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // TITLE
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Arial";

    ctx.fillText(
        "CHOOSE YOUR WAY TO VENT",
        canvas.width / 2,
        90
    );

    // SUBTITLE
    ctx.fillStyle = "#8f959f";
    ctx.font = "16px Arial";

    ctx.fillText(
        "Whatever you're feeling, there's a way to get it out.",
        canvas.width / 2,
        130
    );

    // OPTIONS
    const options = [
        {
            title: "SMASH",
            subtitle: "Break things. Literally.",
            symbol: "🔨"
        },
        {
            title: "SCREAM",
            subtitle: "Scream out what you want.",
            symbol: "🗣️"
        },
        {
            title: "VENT",
            subtitle: "Get it out. No filter.",
            symbol: "📝"
        },
        // {
        //     title: "BURY",
        //     subtitle: "Bury anyone you like to.",
           
        // },
        {
            title: "LET IT GO",
            subtitle: "A little breathing.",
            symbol: "💨"
        }
    ];

    const cardWidth = 240;
    const cardHeight = 165;
    const gap = 20;

    const totalWidth =
        options.length * cardWidth +
        (options.length - 1) * gap;

    const startX =
        (canvas.width - totalWidth) / 2;

    const y =
        canvas.height / 2 - 55;

    options.forEach((option, index) => {

        const x =
            startX +
            index * (cardWidth + gap);


        // HOVER DETECTION
        const isHovered =
            mouseX >= x &&
            mouseX <= x + cardWidth &&
            mouseY >= y &&
            mouseY <= y + cardHeight;


        // CARD SHADOW
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";

        ctx.beginPath();

        ctx.roundRect(
            x + 4,
            y + 6,
            cardWidth,
            cardHeight,
            18
        );

        ctx.fill();


        // CARD
        ctx.fillStyle =
            isHovered
                ? "#292d36"
                : "#1b1e24";

        ctx.beginPath();

        ctx.roundRect(
            x,
            y,
            cardWidth,
            cardHeight,
            18
        );

        ctx.fill();


        // BORDER
        ctx.strokeStyle =
            isHovered
                ? "#ffffff"
                : "#353a44";

        ctx.lineWidth =
            isHovered ? 2 : 1;

        ctx.stroke();


        // SYMBOL
        ctx.font = "30px Arial";

        ctx.fillText(
            option.symbol,
            x + cardWidth / 2,
            y + 38
        );


        // TITLE
        ctx.fillStyle = "#ffffff";

        ctx.font = "bold 20px Arial";

        ctx.fillText(
            option.title,
            x + cardWidth / 2,
            y + 78
        );


        // DESCRIPTION
        ctx.fillStyle = "#9da3ad";

        ctx.font = "14px Arial";

        ctx.fillText(
            option.subtitle,
            x + cardWidth / 2,
            y + 115
        );


        // HOVER ACCENT
        if (isHovered) {

            ctx.fillStyle = "#ffffff";

            ctx.fillRect(
                x + 55,
                y + cardHeight - 12,
                cardWidth - 110,
                2
            );
        }

    });

    ctx.restore();
}

// ==================================================
// PAGE 2 — OFFICE DOOR
// ==================================================

function drawOfficeDoorPage() {

    ctx.fillStyle = "#000000";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    doorX =
        canvas.width / 2 - doorWidth / 2;

    doorY =
        canvas.height / 2 - doorHeight / 2;

    ctx.save();

    // Door frame
    ctx.fillStyle = "#29211c";

    ctx.fillRect(
        doorX - 18,
        doorY - 18,
        doorWidth + 36,
        doorHeight + 36
    );

    // Door
    ctx.fillStyle =
        doorHovered
            ? "#704b2c"
            : "#51351f";

    ctx.fillRect(
        doorX,
        doorY,
        doorWidth,
        doorHeight
    );

    // Door panels
    ctx.strokeStyle = "#392416";
    ctx.lineWidth = 8;

    ctx.strokeRect(
        doorX + 25,
        doorY + 25,
        doorWidth - 50,
        170
    );

    ctx.strokeRect(
        doorX + 25,
        doorY + 220,
        doorWidth - 50,
        170
    );

    // Door handle
    ctx.fillStyle = "#d1ad63";

    ctx.beginPath();

    ctx.arc(
        doorX + doorWidth - 45,
        doorY + doorHeight / 2,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Handle highlight
    ctx.fillStyle = "#fff1b0";

    ctx.beginPath();

    ctx.arc(
        doorX + doorWidth - 48,
        doorY + doorHeight / 2 - 3,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    // Door label
    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 32px Arial";

    ctx.fillStyle =
        doorHovered
            ? "#ffffff"
            : "#c8c8c8";

    ctx.fillText(
        "OFFICE",
        canvas.width / 2,
        doorY + 70
    );

    ctx.restore();
}

// ==================================================
// PAGE 3 — RAGE ROOM
// ==================================================

// ROOM
function drawRoom() {

        // ==================================================
        // WALL
        // ==================================================

        ctx.fillStyle = "#e8dfd2";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height * 0.72
        );

        // ==================================================
        // FLOOR
        // ==================================================

        const floorY =
            canvas.height * 0.72;

        ctx.fillStyle = "#b98d68";

        ctx.fillRect(
            0,
            floorY,
            canvas.width,
            canvas.height - floorY
        );

        ctx.fillStyle = "#8e6549";

        ctx.fillRect(
            0,
            floorY,
            canvas.width,
            5
        );

        // ==================================================
        // WINDOW
        // ==================================================

        const windowX =
            canvas.width * 0.08;

        const windowY =
            canvas.height * 0.10;

        const windowWidth =
            canvas.width * 0.24;

        const windowHeight =
            canvas.height * 0.28;

        if (!isSmashed("window")) {

            ctx.fillStyle = "#ffffff";

            ctx.fillRect(
                windowX,
                windowY,
                windowWidth,
                windowHeight
            );

            ctx.strokeStyle = "#704f3a";
            ctx.lineWidth = 10;

            ctx.strokeRect(
                windowX,
                windowY,
                windowWidth,
                windowHeight
            );

            ctx.fillStyle = "#bfe2f2";

            ctx.fillRect(
                windowX + 5,
                windowY + 5,
                windowWidth - 10,
                windowHeight - 10
            );

            // ==================================================
            // CLOUD
            // ==================================================

            ctx.fillStyle = "#ffffff";

            ctx.beginPath();

            ctx.arc(
                windowX +
                    windowWidth * 0.30,
                windowY +
                    windowHeight * 0.40,
                22,
                0,
                Math.PI * 2
            );

            ctx.arc(
                windowX +
                    windowWidth * 0.40,
                windowY +
                    windowHeight * 0.35,
                30,
                0,
                Math.PI * 2
            );

            ctx.arc(
                windowX +
                    windowWidth * 0.52,
                windowY +
                    windowHeight * 0.43,
                22,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        // ==================================================
        // PLANTS
        // ==================================================

        drawPlant(
            canvas.width * 0.08,
            floorY - 105,
            "plantLeft"
        );

        drawPlant(
            canvas.width * 0.88,
            floorY - 105,
            "plantRight"
        );

        // ==================================================
        // DESK
        // ==================================================

        if (!isSmashed("desk")) {
            drawDesk();
        }

        // ==================================================
        // OTHER SMASHABLE OBJECTS
        // ==================================================

        const targets =
            updateSmashableTargets();

        for (const object of targets) {

            if (object.id === "desk") {
                continue;
            }

            if (isSmashed(object.id)) {
                continue;
            }

            drawSmashable(object);
        }
}

// DESK
function drawDesk() {

        const deskY =
            canvas.height * 0.57;

        const deskWidth =
            canvas.width * 0.55;

        const deskX =
            canvas.width / 2 -
            deskWidth / 2 +
            DESK_OFFSET_X;

        const deskDepth = 150;

        // ==================================================
        // TABLETOP
        // ==================================================

        ctx.fillStyle = "#8b5e3c";

        ctx.fillRect(
            deskX,
            deskY,
            deskWidth,
            deskDepth
        );

        // ==================================================
        // FRONT EDGE
        // ==================================================

        ctx.fillStyle = "#70472e";

        ctx.fillRect(
            deskX,
            deskY + deskDepth,
            deskWidth,
            28
        );

        // ==================================================
        // LEGS
        // ==================================================

        const legWidth = 28;

        const legHeight =
            canvas.height -
            (deskY + deskDepth + 28);

        ctx.fillRect(
            deskX + 30,
            deskY + deskDepth + 28,
            legWidth,
            legHeight
        );

        ctx.fillRect(
            deskX +
                deskWidth -
                30 -
                legWidth,
            deskY + deskDepth + 28,
            legWidth,
            legHeight
        );
}

// PLANTS
function drawPlant(x, y, id) {

        if (isSmashed(id)) {
            return;
        }

        // Pot

        ctx.fillStyle = "#b56f4a";

        ctx.fillRect(
            x - 32,
            y + 55,
            64,
            50
        );

        // Rim

        ctx.fillStyle = "#513a2a";

        ctx.fillRect(
            x - 30,
            y + 52,
            60,
            12
        );

        // Leaves

        ctx.fillStyle = "#557a4f";

        const leaves = [
            [-28, 35],
            [-12, 5],
            [5, 25],
            [20, -5],
            [30, 35],
            [-5, -20]
        ];

        for (const [dx, dy] of leaves) {

            ctx.beginPath();

            ctx.ellipse(
                x + dx,
                y + dy,
                18,
                35,
                dx * 0.02,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
}
    
// SMASHABLE TARGETS
function updateSmashableTargets() {

        const deskY =
            canvas.height * 0.57;

        const deskWidth =
            canvas.width * 0.55;

        const deskX =
            canvas.width / 2 -
            deskWidth / 2 +
            DESK_OFFSET_X;

        const deskDepth = 150;

        // ==================================================
        // WINDOW
        // ==================================================

        const windowX =
            canvas.width * 0.08;

        const windowY =
            canvas.height * 0.10;

        const windowWidth =
            canvas.width * 0.24;

        const windowHeight =
            canvas.height * 0.28;

        // ==================================================
        // MONITOR
        // ==================================================

        const monitorWidth = 260;
        const monitorHeight = 150;

        const monitorX =
            deskX +
            deskWidth / 2 -
            monitorWidth / 2;

        const monitorY =
            deskY -
            monitorHeight +
            20;

        // ==================================================
        // KEYBOARD
        // ==================================================

        const keyboardWidth = 180;
        const keyboardHeight = 38;

        const keyboardX =
            monitorX +
            (monitorWidth -
                keyboardWidth) / 2;

        const keyboardY =
            deskY +
            deskDepth -
            keyboardHeight -
            28;

        // ==================================================
        // MOUSE
        // ==================================================

        const mouseWidth = 38;
        const mouseHeight = 55;

        const mouseXPosition =
            keyboardX +
            keyboardWidth +
            25;

        const mouseYPosition =
            keyboardY - 5;

        // ==================================================
        // PRINTER
        // ==================================================

        const printerWidth = 150;
        const printerHeight = 300;

        const printerX =
            deskX +
            deskWidth -
            printerWidth -
            30;

        const printerY =
            deskY -
            printerHeight +
            100;

        // ==================================================
        // MANAGER
        // ==================================================

        const floorY =
            canvas.height * 0.72;

        const managerWidth = 90;
        const managerHeight = 225;

        const managerX =
            canvas.width * 0.79 -
            managerWidth / 2;

        const managerY =
            floorY -
            managerHeight +
            150;

        return [

            {
                id: "window",
                type: "window",
                x: windowX,
                y: windowY,
                width: windowWidth,
                height: windowHeight
            },

            {
                id: "monitor",
                type: "monitor",
                x: monitorX,
                y: monitorY,
                width: monitorWidth,
                height: monitorHeight
            },

            {
                id: "keyboard",
                type: "keyboard",
                x: keyboardX,
                y: keyboardY,
                width: keyboardWidth,
                height: keyboardHeight
            },

            {
                id: "mouse",
                type: "mouse",
                x: mouseXPosition,
                y: mouseYPosition,
                width: mouseWidth,
                height: mouseHeight
            },

            {
                id: "printer",
                type: "printer",
                x: printerX,
                y: printerY,
                width: printerWidth,
                height: printerHeight
            },

            {
                id: "plantLeft",
                type: "plant",
                x: canvas.width * 0.08 - 45,
                y: deskY - 120,
                width: 90,
                height: 130
            },

            {
                id: "plantRight",
                type: "plant",
                x: canvas.width * 0.88 - 45,
                y: deskY - 110,
                width: 90,
                height: 130
            },

            {
                id: "drawers",
                type: "drawers",
                x: deskX + 50,
                y: deskY + 15,
                width: 120,
                height: 100
            },

            {
                id: "manager",
                type: "manager",
                x: managerX,
                y: managerY,
                width: managerWidth,
                height: managerHeight
            },

            {
                id: "desk",
                type: "desk",
                x: deskX,
                y: deskY,
                width: deskWidth,
                height: deskDepth + 30
            }
        ];
}

// DRAW SMASHABLE OBJECT
function drawSmashable(object) {

        const {
            type,
            x,
            y,
            width,
            height
        } = object;

        // ==================================================
        // WINDOW
        // ==================================================

        if (type === "window") {
            return;
        }

        // ==================================================
        // MONITOR
        // ==================================================

        if (type === "monitor") {

            ctx.fillStyle = "#222";

            ctx.fillRect(
                x,
                y,
                width,
                height
            );

            ctx.fillStyle = "#4f7080";

            ctx.fillRect(
                x + 10,
                y + 10,
                width - 20,
                height - 20
            );

            ctx.fillStyle =
                "rgba(255,255,255,0.12)";

            ctx.fillRect(
                x + 20,
                y + 20,
                width * 0.25,
                height - 40
            );

            // Monitor stand

            const standWidth = 10;
            const standHeight = 24;

            const standX =
                x +
                width / 2 -
                standWidth / 2;

            const standY =
                y + height;

            ctx.fillStyle = "#363636";

            ctx.fillRect(
                standX,
                standY,
                standWidth,
                standHeight
            );

            const baseWidth = 70;
            const baseHeight = 8;

            const baseX =
                x +
                width / 2 -
                baseWidth / 2;

            const baseY =
                standY +
                standHeight;

            ctx.fillRect(
                baseX,
                baseY,
                baseWidth,
                baseHeight
            );
        }

        // ==================================================
        // KEYBOARD
        // ==================================================

        if (type === "keyboard") {

            ctx.fillStyle = "#292929";

            ctx.fillRect(
                x,
                y,
                width,
                height
            );

            ctx.fillStyle = "#666";

            const keySize = 12;

            for (let row = 0; row < 2; row++) {

                for (let col = 0; col < 11; col++) {

                    ctx.fillRect(
                        x + 8 + col * 15,
                        y + 7 + row * 14,
                        keySize,
                        8
                    );
                }
            }
        }

        // ==================================================
        // MOUSE
        // ==================================================

        if (type === "mouse") {

            ctx.fillStyle = "#292929";

            ctx.beginPath();

            ctx.ellipse(
                x + width / 2,
                y + height / 2,
                width / 2,
                height / 2,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.fillStyle = "#777";

            ctx.fillRect(
                x + width / 2 - 2,
                y + 8,
                4,
                15
            );
        }

        // ==================================================
        // PRINTER
        // ==================================================

        if (type === "printer") {

            ctx.fillStyle = "#d6d6d6";

            ctx.fillRect(
                x,
                y,
                width,
                height
            );

            ctx.fillStyle = "#b0b0b0";

            ctx.fillRect(
                x + 15,
                y + 25,
                width - 30,
                35
            );

            ctx.fillStyle = "#eeeeee";

            ctx.fillRect(
                x + 30,
                y - 18,
                width - 60,
                40
            );
        }

        // ==================================================
        // DRAWERS
        // ==================================================

        if (type === "drawers") {

            ctx.fillStyle = "#6c452e";

            ctx.fillRect(
                x,
                y,
                width,
                height
            );

            ctx.strokeStyle = "#4d301f";
            ctx.lineWidth = 4;

            ctx.strokeRect(
                x,
                y,
                width,
                height
            );

            ctx.fillStyle = "#c5a06e";

            ctx.fillRect(
                x + 45,
                y + 30,
                20,
                6
            );

            ctx.fillRect(
                x + 45,
                y + 65,
                20,
                6
            );
        }

        // ==================================================
        // MANAGER
        // ==================================================

        if (type === "manager") {

            const centerX =
                x + width / 2;

            const scaleX = 1.5;
            const scaleY = 2.5;

            ctx.save();

            ctx.translate(
                centerX,
                y + height
            );

            ctx.scale(
                scaleX,
                scaleY
            );

            ctx.translate(
                -centerX,
                -(y + height)
            );

            // Head

            ctx.fillStyle = "#d89b72";

            ctx.beginPath();

            ctx.arc(
                centerX,
                y + 34,
                28,
                0,
                Math.PI * 2
            );

            ctx.fill();

            // Hair

            ctx.fillStyle = "#3d2b24";

            ctx.beginPath();

            ctx.arc(
                centerX,
                y + 25,
                28,
                Math.PI,
                Math.PI * 2
            );

            ctx.fill();

            // Neck

            ctx.fillStyle = "#d89b72";

            ctx.fillRect(
                centerX - 10,
                y + 56,
                20,
                18
            );

            // Suit

            ctx.fillStyle = "#303744";

            ctx.fillRect(
                centerX - 31,
                y + 70,
                62,
                88
            );

            // Shirt

            ctx.fillStyle = "#eeeeee";

            ctx.fillRect(
                centerX - 13,
                y + 71,
                26,
                48
            );

            // Tie

            ctx.fillStyle = "#9b3030";

            ctx.beginPath();

            ctx.moveTo(
                centerX,
                y + 74
            );

            ctx.lineTo(
                centerX - 8,
                y + 105
            );

            ctx.lineTo(
                centerX,
                y + 121
            );

            ctx.lineTo(
                centerX + 8,
                y + 105
            );

            ctx.closePath();

            ctx.fill();

            // Arms

            ctx.strokeStyle = "#303744";
            ctx.lineWidth = 18;
            ctx.lineCap = "round";

            ctx.beginPath();

            ctx.moveTo(
                centerX - 29,
                y + 78
            );

            ctx.lineTo(
                centerX - 52,
                y + 140
            );

            ctx.stroke();

            ctx.beginPath();

            ctx.moveTo(
                centerX + 29,
                y + 78
            );

            ctx.lineTo(
                centerX + 52,
                y + 140
            );

            ctx.stroke();

            // Hands

            ctx.fillStyle = "#d89b72";

            ctx.beginPath();

            ctx.arc(
                centerX - 52,
                y + 146,
                10,
                0,
                Math.PI * 2
            );

            ctx.arc(
                centerX + 52,
                y + 146,
                10,
                0,
                Math.PI * 2
            );

            ctx.fill();

            // Legs

            ctx.strokeStyle = "#252b35";
            ctx.lineWidth = 22;

            ctx.beginPath();

            ctx.moveTo(
                centerX - 15,
                y + 158
            );

            ctx.lineTo(
                centerX - 19,
                y + 210
            );

            ctx.moveTo(
                centerX + 15,
                y + 158
            );

            ctx.lineTo(
                centerX + 19,
                y + 210
            );

            ctx.stroke();

            // Shoes

            ctx.strokeStyle = "#181818";
            ctx.lineWidth = 13;

            ctx.beginPath();

            ctx.moveTo(
                centerX - 19,
                y + 210
            );

            ctx.lineTo(
                centerX - 36,
                y + 220
            );

            ctx.moveTo(
                centerX + 19,
                y + 210
            );

            ctx.lineTo(
                centerX + 36,
                y + 220
            );

            ctx.stroke();

            ctx.restore();

            // ==================================================
            // SPEECH BUBBLE
            // ==================================================

            if (!isSmashed("manager")) {

                const headY =
                    (y + height) +
                    (34 - height) * scaleY;

                const bubbleX =
                    centerX - 265;

                const bubbleY =
                    headY - 65;

                const bubbleWidth = 210;
                const bubbleHeight = 60;

                ctx.fillStyle = "#ffffff";

                ctx.beginPath();

                ctx.roundRect(
                    bubbleX,
                    bubbleY,
                    bubbleWidth,
                    bubbleHeight,
                    14
                );

                ctx.fill();

                ctx.strokeStyle = "#333";
                ctx.lineWidth = 3;

                ctx.stroke();

                // Tail

                ctx.fillStyle = "#ffffff";

                ctx.beginPath();

                ctx.moveTo(
                    bubbleX + bubbleWidth - 48,
                    bubbleY + bubbleHeight
                );

                ctx.lineTo(
                    bubbleX + bubbleWidth - 8,
                    bubbleY + bubbleHeight + 18
                );

                ctx.lineTo(
                    bubbleX + bubbleWidth - 25,
                    bubbleY + bubbleHeight
                );

                ctx.closePath();

                ctx.fill();

                ctx.stroke();

                // Text

                ctx.fillStyle = "#222";

                ctx.font = "bold 18px Arial";

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.fillText(
                    "Are you done yet?",
                    bubbleX + bubbleWidth / 2,
                    bubbleY + bubbleHeight / 2
                );
            }
        }
}

// ==================================================
// UI / TEXT
// ==================================================

// HIT Text
function drawEntranceHit() {

    if (!showEntranceHit) {
        return;
    }

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font =
        "bold 32px Arial";

    ctx.fillStyle = "#000000";

    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;

    ctx.fillText(
        "HIT!",
        canvas.width / 2,
        canvas.height * 0.18
    );

    ctx.restore();
}

// HIT AGAIN Text
function drawHitAgainText() {

    if (hitAgainTimer <= 0) {
        return;
    }

    hitAgainTimer -= 16;

    hitAgainOpacity =
        Math.max(
            hitAgainTimer / 900,
            0
        );

    ctx.save();

    ctx.globalAlpha =
        hitAgainOpacity;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font =
        "bold 32px Arial";

    ctx.fillStyle = "#000000";

    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 12;

    ctx.fillText(
        hitAgainText,
        canvas.width / 2,
        canvas.height * 0.18
    );

    ctx.restore();
}

// SMASH LEGEND Text
function drawLegendText() {

    if (!celebrationStarted) {
        return;
    }

    legendTextOpacity =
        Math.min(
            legendTextOpacity + 0.015,
            1
        );

    ctx.save();

    ctx.globalAlpha =
        legendTextOpacity;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Main glow

    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 25;

    ctx.fillStyle = "#ffffff";


    ctx.font =
        "40px Arial";
    ctx.fillText(
        "DAMAGE 100",
        canvas.width / 2,
        canvas.height * 0.62
    );

    ctx.font =
        "bold 64px Arial";
    ctx.fillText(
        "SMASH LEGEND",
        canvas.width / 2,
        canvas.height * 0.82
    );

    ctx.restore();
}

// ==================================================
// HAMMER
// ==================================================


// DRAW HAMMER
function drawHammer(x, y) {

    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(hammerAngle);

    const handleLength = 105;

    // Main handle

    ctx.strokeStyle = "#704522";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.lineTo(
        0,
        -handleLength
    );

    ctx.stroke();

    // Highlight

    ctx.strokeStyle = "#a86f3c";
    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(-3, -8);

    ctx.lineTo(
        -3,
        -handleLength + 8
    );

    ctx.stroke();

    // Grip

    ctx.strokeStyle = "#49301e";
    ctx.lineWidth = 17;

    ctx.beginPath();

    ctx.moveTo(0, -8);

    ctx.lineTo(
        0,
        28
    );

    ctx.stroke();

    // Head

    const headY =
        -handleLength;

    ctx.fillStyle = "#777";

    ctx.beginPath();

    ctx.roundRect(
        -50,
        headY - 20,
        100,
        40,
        10
    );

    ctx.fill();

    // Striking face

    ctx.fillStyle = "#5c5c5c";

    ctx.beginPath();

    ctx.roundRect(
        -63,
        headY - 16,
        22,
        32,
        5
    );

    ctx.fill();

    // Claw

    ctx.fillStyle = "#666";

    ctx.beginPath();

    ctx.moveTo(
        42,
        headY - 15
    );

    ctx.lineTo(
        67,
        headY - 2
    );

    ctx.lineTo(
        53,
        headY + 8
    );

    ctx.lineTo(
        40,
        headY + 15
    );

    ctx.closePath();

    ctx.fill();

    // Highlight

    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.moveTo(
        -25,
        headY - 10
    );

    ctx.lineTo(
        25,
        headY - 10
    );

    ctx.stroke();

    // Handle connection

    ctx.fillStyle = "#555";

    ctx.fillRect(
        -9,
        headY + 15,
        18,
        20
    );

    ctx.restore();
}

// HAMMER HEAD POSITION
function getHammerHeadPosition() {

    const headLength = 105;

    return {

        x:
            mouseX +
            Math.sin(hammerAngle) *
            headLength,

        y:
            mouseY -
            Math.cos(hammerAngle) *
            headLength
    };
}

// HIT DETECTION
function checkHammerHit() {

    const {
        x: headX,
        y: headY
    } = getHammerHeadPosition();

    const targets =
        updateSmashableTargets();

    for (const object of targets) {

        if (isSmashed(object.id)) {
            continue;
        }

        let hitboxX = object.x;
        let hitboxY = object.y;
        let hitboxWidth = object.width;
        let hitboxHeight = object.height;

        // Manager gets a larger collision box
        // without changing his visual position.

        if (object.type === "manager") {

            hitboxX =
                object.x - 55;

            hitboxY =
                object.y - 300;

            hitboxWidth =
                object.width + 110;

            hitboxHeight =
                object.height + 300;
        }

        const closestX =
            Math.max(
                hitboxX,
                Math.min(
                    headX,
                    hitboxX + hitboxWidth
                )
            );

        const closestY =
            Math.max(
                hitboxY,
                Math.min(
                    headY,
                    hitboxY + hitboxHeight
                )
            );

        const distanceX =
            headX - closestX;

        const distanceY =
            headY - closestY;

        const distance =
            Math.sqrt(
                distanceX * distanceX +
                distanceY * distanceY
            );

       if (distance < 42) {

        showEntranceHit = false;

        smashObject(
            object,
            headX,
            headY
        );

        break;
        }
    }
}

// HAMMER UPDATE
function updateHammer() {

    if (hammerSwinging) {

        hammerAngle = lerp(
            hammerAngle,
            HAMMER_STRIKE_ANGLE,
            0.75
        );

        if (
            Math.abs(
                hammerAngle -
                HAMMER_STRIKE_ANGLE
            ) < 0.04
        ) {

            checkHammerHit();

            hammerSwinging = false;
            hammerReturning = true;

            hammerAngle =
                HAMMER_STRIKE_ANGLE +
                0.12;
        }
    }

    else if (hammerReturning) {

        hammerAngle = lerp(
            hammerAngle,
            HAMMER_REST_ANGLE,
            0.38
        );

        if (
            Math.abs(
                hammerAngle -
                HAMMER_REST_ANGLE
            ) < 0.03
        ) {

            hammerAngle =
                HAMMER_REST_ANGLE;

            hammerReturning = false;
        }
    }
}

// ==================================================
// SMASH EFFECTS
// ==================================================

// SMASH DESK CONTENTS
function smashDeskContents(hitX, hitY) {

    const deskContents = [
        "monitor",
        "keyboard",
        "mouse",
        "printer"
    ];

    for (const id of deskContents) {

        if (smashedObjects.has(id)) {
            continue;
        }

        const object =
            updateSmashableTargets().find(
                target => target.id === id
            );

        if (!object) {
            continue;
        }

        // Mark as smashed
        smashedObjects.add(id);

        // Create a small explosion
        for (let i = 0; i < 12; i++) {

            particles.push({

                x: object.x + object.width / 2,
                y: object.y + object.height / 2,

                vx: random(-220, 220),
                vy: random(-280, 80),

                life: 1,

                size: random(2, 5),

                color:
                    getDebrisColor(
                        object.type
                    )
            });
        }
    }
}

// SMASH OBJECT - CCreates Effects
function smashObject(object, hitX, hitY) {

    // Count hit
    const currentHits =
        (hitCounts.get(object.id) || 0) + 1;

    hitCounts.set(
        object.id,
        currentHits
    );

    // Every hit makes a THUD

    playThud();

    // HIT 1
    if (currentHits === 1) {

        hitAgainText = "HIT AGAIN!";
        hitAgainOpacity = 1;
        hitAgainTimer = 900;

        screenShake = 6;
        screenShakeTimer = 800;

        return;
    }


    // HIT 2
    if (currentHits === 2) {

        hitAgainText = "HIT AGAIN!";
        hitAgainOpacity = 1;
        hitAgainTimer = 900;

        screenShake = 10;
        screenShakeTimer = 1600;

        return;
    }

    // ==================================================
    // HIT 3 = BIG SMASH
    // ==================================================

    smashedObjects.add(
        object.id
    );

    if (object.id === "desk") {

    smashDeskContents(
        hitX,
        hitY
        );
    }

    screenShake = 16;
    screenShakeTimer = 2400;

    const pieceCount =
        object.type === "window"
            ? 24
            : object.type === "desk"
                ? 18
                : 10;

    const cols =
        object.type === "window"
            ? 6
            : object.type === "desk"
                ? 6
                : 4;

    const rows =
        Math.ceil(
            pieceCount / cols
        );

    const pieceWidth =
        object.width / cols;

    const pieceHeight =
        object.height / rows;

    for (
        let i = 0;
        i < pieceCount;
        i++
    ) {

        const col =
            i % cols;

        const row =
            Math.floor(
                i / cols
            );

        const pieceX =
            object.x +
            col * pieceWidth;

        const pieceY =
            object.y +
            row * pieceHeight;

        const centerX =
            pieceX +
            pieceWidth / 2;

        const centerY =
            pieceY +
            pieceHeight / 2;

        const dx =
            centerX - hitX;

        const dy =
            centerY - hitY;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            ) || 1;

        debris.push({

            x: pieceX,
            y: pieceY,

            width: pieceWidth,
            height: pieceHeight,

            vx:
                (dx / distance) *
                random(100, 260) +
                random(-80, 80),

            vy:
                (dy / distance) *
                random(80, 220) -
                random(80, 180),

            rotation:
                random(-0.3, 0.3),

            rotationSpeed:
                random(-4, 4),

            gravity:
                object.type === "window"
                    ? 0.7
                    : 0.55,

            life: 1,

            color:
                getDebrisColor(
                    object.type
                )
        });
    }

    // ==================================================
    // GLASS EXPLOSION
    // ==================================================

    if (object.type === "window") {

        for (let i = 0; i < 35; i++) {

            particles.push({

                x: hitX,
                y: hitY,

                vx:
                    random(-350, 350),

                vy:
                    random(-350, 150),

                life: 1,

                size:
                    random(2, 6),

                color: "#9fc9d9"
            });
        }
    }

    // ==================================================
    // IMPACT PARTICLES
    // ==================================================

    for (let i = 0; i < 35; i++) {

        particles.push({

            x: hitX,
            y: hitY,

            vx:
                random(-280, 280),

            vy:
                random(-300, 100),

            life: 1,

            size:
                random(2, 5),

            color: "#777"
        });
    }

    // ==================================================
    // CHECK FOR COMPLETE ROOM
    // ==================================================

    const targets =
        updateSmashableTargets();

    if (
        smashedObjects.size >= targets.length &&
        !celebrationStarted
    ) {

        celebrationStarted = true;

        fireworkAudio.currentTime = 0;
        fireworkAudio.play();

        // ==================================================
        // FIREWORK FINALE
        // ==================================================

        for (let i = 0; i < 45; i++) {

            setTimeout(
                () => launchFirework(),
                i * 160
            );
        }
    }
}

// THUD SOUND 
function playThud() {

    const audioContext =
        new (window.AudioContext || window.webkitAudioContext)();

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type = "triangle";

    oscillator.frequency.setValueAtTime(
        90,
        audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
        45,
        audioContext.currentTime + 0.12
    );

    gain.gain.setValueAtTime(
        8,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.14
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + 0.14
    );
}

// DEBRIS COLORS - Determines what the debris looks like
function getDebrisColor(type) {

    if (type === "window") {
        return "#9fc9d9";
    }

    if (
        type === "monitor" ||
        type === "keyboard" ||
        type === "mouse"
    ) {
        return "#555";
    }

    if (type === "printer") {
        return "#bdbdbd";
    }

    if (
        type === "desk" ||
        type === "drawers"
    ) {
        return "#70472e";
    }

    if (type === "plant") {
        return "#557a4f";
    }

    if (type === "manager") {
        return "#303744";
    }

    return "#777";
}

// UPDATE DEBRIS - Moves the debris
function updateDebris() {

    const floorY =
        canvas.height * 0.72;

    for (
        let i = debris.length - 1;
        i >= 0;
        i--
    ) {

        const piece =
            debris[i];

        piece.vy +=
            piece.gravity;

        piece.x +=
            piece.vx;

        piece.y +=
            piece.vy;

        piece.rotation +=
            piece.rotationSpeed;

        if (
            piece.y +
            piece.height >
            floorY
        ) {

            piece.y =
                floorY -
                piece.height;

            piece.vy *= -0.35;

            piece.vx *= 0.88;

            piece.rotationSpeed *= 0.9;
        }

        piece.life -=
            0.006;

        if (piece.life <= 0) {

            debris.splice(
                i,
                1
            );
        }
    }
}

// DRAW DEBRIS - Displays it
function drawDebris() {

    for (const piece of debris) {

        ctx.save();

        ctx.translate(
            piece.x +
                piece.width / 2,
            piece.y +
                piece.height / 2
        );

        ctx.rotate(
            piece.rotation
        );

        ctx.globalAlpha =
            Math.max(
                piece.life,
                0
            );

        ctx.fillStyle =
            piece.color;

        ctx.fillRect(
            -piece.width / 2,
            -piece.height / 2,
            piece.width,
            piece.height
        );

        ctx.restore();
    }

    ctx.globalAlpha = 1;
}

// PARTICLES

// Moves/fades particles
function updateParticles() {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];

        particle.x +=
            particle.vx;

        particle.y +=
            particle.vy;

        particle.vy +=
            0.25;

        particle.vx *=
            0.98;

        particle.life -=
            0.025;

        if (particle.life <= 0) {

            particles.splice(
                i,
                1
            );
        }
    }
}

//Displays them 
function drawParticles() {

    for (const particle of particles) {

        ctx.globalAlpha =
            particle.life;

        ctx.fillStyle = particle.color || "#d8c29b";

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


// ==================================================
// FIREWORKS
// ==================================================


// LAUNCH FIREWORKS
function launchFirework() {

    fireworks.push({

        x:
            random(
                canvas.width * 0.03,
                canvas.width * 0.97
            ),

        y:
            canvas.height + 20,

        targetY:
            random(
                canvas.height * 0.10,
                canvas.height * 0.55
            ),

        speed:
            random(14, 19),

        exploded: false,

        particles: [],

        // White / silver / icy blue

        color:
            Math.random() < 0.7
                ? "#ffffff"
                : "#dce8ff"
    });
}

// EXPLODE FIREWORK
function explodeFirework(firework) {

    firework.exploded = true;

    const particleCount = 180;

    for (
        let i = 0;
        i < particleCount;
        i++
    ) {

        const angle =
            (Math.PI * 2 * i) /
            particleCount;

        const speed =
            random(4, 10);

        firework.particles.push({

            x:
                firework.x,

            y:
                firework.y,

            previousX:
                firework.x,

            previousY:
                firework.y,

            velocityX:
                Math.cos(angle) *
                speed,

            velocityY:
                Math.sin(angle) *
                speed,

            life:
                random(0.7, 1),

            decay:
                random(0.008, 0.014),

            size:
                random(1, 2.5),

            color:
                firework.color
        });
    }
}

// UPDATE FIREWORKS
function updateFireworks() {

    for (
        let i = fireworks.length - 1;
        i >= 0;
        i--
    ) {

        const firework =
            fireworks[i];

        // ==================================================
        // ROCKET RISING
        // ==================================================

        if (!firework.exploded) {

            firework.y -=
                firework.speed;

            firework.speed *=
                0.985;

            if (
                firework.y <=
                firework.targetY
            ) {

                explodeFirework(
                    firework
                );
            }
        }

        // ==================================================
        // EXPLOSION PARTICLES
        // ==================================================

        else {

            for (
                let j =
                    firework.particles.length - 1;

                j >= 0;

                j--
            ) {

                const particle =
                    firework.particles[j];

                particle.previousX =
                    particle.x;

                particle.previousY =
                    particle.y;

                particle.x +=
                    particle.velocityX;

                particle.y +=
                    particle.velocityY;

                // Gravity

                particle.velocityY +=
                    0.045;

                // Air resistance

                particle.velocityX *=
                    0.992;

                particle.velocityY *=
                    0.992;

                particle.life -=
                    particle.decay;

                if (
                    particle.life <= 0
                ) {

                    firework.particles
                        .splice(j, 1);
                }
            }

            if (
                firework.particles.length === 0
            ) {

                fireworks.splice(
                    i,
                    1
                );
            }
        }
    }
}

// DRAW FIREWORKS
function drawFireworks() {

    for (
        const firework of fireworks
    ) {

        // ==================================================
        // ROCKET
        // ==================================================

        if (!firework.exploded) {

            ctx.beginPath();

            ctx.arc(
                firework.x,
                firework.y,
                3,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#ffffff";

            ctx.fill();

            // Rocket trail

            ctx.beginPath();

            ctx.moveTo(
                firework.x,
                firework.y + 4
            );

            ctx.lineTo(
                firework.x,
                firework.y + 35
            );

            ctx.strokeStyle =
                "rgba(255,255,255,0.8)";

            ctx.lineWidth = 2;

            ctx.stroke();
        }

        // ==================================================
        // EXPLOSION
        // ==================================================

        else {

            for (
                const particle of
                firework.particles
            ) {

                // Spark trail

                ctx.beginPath();

                ctx.moveTo(
                    particle.previousX,
                    particle.previousY
                );

                ctx.lineTo(
                    particle.x,
                    particle.y
                );

                ctx.strokeStyle =
                    particle.color;

                ctx.globalAlpha =
                    particle.life * 0.8;

                ctx.lineWidth =
                    particle.size;

                ctx.stroke();

                // Bright spark

                ctx.beginPath();

                ctx.arc(
                    particle.x,
                    particle.y,
                    particle.size,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    particle.color;

                ctx.globalAlpha =
                    particle.life;

                ctx.fill();
            }

            ctx.globalAlpha = 1;
        }
    }
}

// SCREAM PAGE
function drawScreamPage() {

    feelingsBox.style.display = "block";

    //TRIM TRAILING WHITESPACES
    feelingsBox.value = feelingsBox.value.trimStart();

    // BACKGROUND IMAGE
    ctx.drawImage(
        screamBackground,
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // TITLE
    ctx.fillStyle = "#FF0000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const titleWidth = 400;
    const centerX = canvas.width / 2;

    function drawAlignedText(text, y, maxFontSize) {
        let fontSize = maxFontSize;

        ctx.font = `600 ${fontSize}px Oswald`;

        while (ctx.measureText(text).width > titleWidth) {
            fontSize--;
            ctx.font = `600 ${fontSize}px Oswald`;
        }

        ctx.fillText(text, centerX, y);
    }

    drawAlignedText("SCREAM", 80, 90);
    drawAlignedText("INTO THE DARK", 140, 55);

    // POSITION FEELINGS BOX
    feelingsBox.style.left =
        canvas.offsetLeft + (canvas.width - 500) / 2 + "px";

    feelingsBox.style.top =
        canvas.offsetTop + "270px";

    if (!screamAgainMode) {

        // SCREAM BUTTON
        ctx.drawImage(
            screamButtonImage,
            canvas.width / 2 - 175,
            390,
            350,
            200
        );

        // SCREAM BUTTON SUBTITLE
        ctx.fillStyle = "#ffffff";
        ctx.font = "400 18px Oswald";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            "Hit the button when done",
            canvas.width / 2,
            390
        );
    }
    ctx.restore();
}

// VENT PAGE
function drawVentPage() {

    ctx.fillStyle = "#000000";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
    
    if (!ventRoomChosen) {

        ventRoomSelection.style.display = "flex";
        ventBox.style.display = "none";

        return;
    }

    ventRoomSelection.style.display = "none";
    ventBox.style.display = "block";
    

    //TRIM TRAILING WHITESPACES
    ventBox.value = ventBox.value.trimStart();

    // VENT BOX POSITION
    ventBox.style.left =
        canvas.offsetLeft +
        (canvas.width - 500) / 2 + "px";

    ventBox.style.top =
        canvas.offsetTop + 520 + "px";
}

// LIVE VENT MESSAGE
function displayLiveVentMessage(text) {
    const message = document.createElement("div");

    message.className = "vent-live-message";
    message.textContent = text;

    // Give each message its own random pastel color.
    message.style.color =
        `hsl(${Math.random() * 360}, 85%, 75%)`;

    // Position the message relative to the canvas.
    const canvasRect = canvas.getBoundingClientRect();
    const ventBoxRect = ventBox.getBoundingClientRect();

    message.style.left =
        canvasRect.left + canvas.clientWidth / 2 + "px";

    message.style.top =
        canvasRect.top + Math.random() *
        Math.max(0, ventBoxRect.top - canvasRect.top) + "px";

    document.body.appendChild(message);

    // Remove this particular message after 8 seconds.
    setTimeout(() => {
        message.remove();
    }, 8000);
}

// LET IT GO PAGE
function drawLetItGoPage() {

    // Background
    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Start cycle
    if (letGoStartTime === null) {
        letGoStartTime = Date.now();
    }

    const elapsed =
        (Date.now() - letGoStartTime) / 1000;

    // Find current phase
    const cycleTime =
        elapsed % breathingCycleDuration;

    let phaseIndex = 0;
    let phaseElapsed = cycleTime;

    for (let i = 0; i < breathingPhases.length; i++) {

        if (phaseElapsed < breathingPhases[i].duration) {
            phaseIndex = i;
            break;
        }

        phaseElapsed -= breathingPhases[i].duration;
    }

    const phase = breathingPhases[phaseIndex];

    const progress =
        phaseElapsed / phase.duration;

    // Heading
    ctx.textAlign = "center";
    ctx.fillStyle = "#f2eee6";
    ctx.font = "bold 48px Arial";

    ctx.fillText(
        "LET IT GO",
        canvas.width / 2,
        100
    );

    // Breathing instruction
    ctx.font = "24px Arial";
    ctx.fillStyle = "#e8e3d7";

    ctx.fillText(
        phase.name,
        canvas.width / 2,
        180
    );

    // Countdown
    const remaining =
        Math.ceil(phase.duration - phaseElapsed);

    ctx.font = "17px Arial";
    ctx.fillStyle = "#aaa6a0";

    ctx.fillText(
        remaining.toString(),
        canvas.width / 2,
        215
    );

    
    // DANDELION ANIMATION
    let growth = 1;
    let sway = 0;
    let releasedCount = 0;

    if (phaseIndex === 0) {

        // BREATHE IN
        const smoothProgress =
            1 - Math.pow(1 - progress, 3);

        growth = 0.05 + 0.95 * smoothProgress;

    } else if (phaseIndex === 1) {

        // HOLD
        growth = 1;
        sway = Math.sin(Date.now() / 900) * 0.025;

    } else if (phaseIndex === 2) {

        // BREATHE OUT
        growth = 1;

        releasedCount = Math.floor(progress * 100);

    } else {

        // REST
        growth = 0.05;
    }

    // DRAW DANDELION
    ctx.save();

    ctx.translate(
        canvas.width / 2,
        canvas.height - 35
    );

    ctx.rotate(sway);

    drawDandelion(
        0,
        0,
        1,
        releasedCount
    );

    if (phaseIndex === 2) {
        drawReleasedSeeds(releasedCount, progress);
    }

    ctx.restore();

}

// DRAWS DANDELION
function drawDandelion(x, y, scale = 1, releasedCount = 0) {

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const headY = -185;

    // Curved green stem
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-8, -65, 7, -125, 0, headY);

    ctx.strokeStyle = "#829879";
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Subtle stem highlight
    ctx.beginPath();
    ctx.moveTo(-1, -10);
    ctx.bezierCurveTo(-5, -75, 4, -125, -1, headY);
    ctx.strokeStyle = "rgba(210,225,190,0.3)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Dandelion seed head
    const seedCount = 240;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < seedCount - releasedCount; i++) {

        const radius = 42 * Math.sqrt((i + 0.5) / seedCount);
        const angle = i * goldenAngle;

        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius * 0.88;

        // Individual seed stalk
        const length = 5 + (i % 5) * 0.8;

        const direction = Math.atan2(sy, sx);

        const tipX = sx + Math.cos(direction) * length;
        const tipY = headY + sy + Math.sin(direction) * length;

        ctx.beginPath();
        ctx.moveTo(sx, headY + sy);
        ctx.lineTo(tipX, tipY);

        ctx.strokeStyle = "rgba(235,232,219,0.65)";
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Silky parachute filaments
        const filamentCount = 9;
        const tuftSize = 7 + (i % 4);

        for (let j = 0; j < filamentCount; j++) {

            const spread =
                (j / (filamentCount - 1) - 0.5) * 1.8;

            const a = direction + spread;

            const endX =
                tipX + Math.cos(a) * tuftSize;

            const endY =
                tipY + Math.sin(a) * tuftSize;

            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(endX, endY);

            ctx.strokeStyle =
                `rgba(245,242,232,${0.45 + (i % 5) * 0.08})`;

            ctx.lineWidth = 0.65;
            ctx.stroke();
        }

        // Tiny dark seed at the base of each parachute
        ctx.beginPath();
        ctx.arc(tipX, tipY, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#c9c5b8";
        ctx.fill();
    }

    // Soft central receptacle
    const glow = ctx.createRadialGradient(
        0, headY, 1,
        0, headY, 12
    );

    glow.addColorStop(0, "rgba(238,232,213,0.5)");
    glow.addColorStop(1, "rgba(238,232,213,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, headY, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// DANDELION SEED RELEASE
function drawReleasedSeeds(releasedCount, progress) {

    const seedCount = 240;
    const headY = -185;

    if (releasedCount <= 0) return;

    const firstReleased = seedCount - releasedCount;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = firstReleased; i < seedCount; i++) {

        // Original seed position on the flower
        const radius =
            42 * Math.sqrt((i + 0.5) / seedCount);

        const angle = i * goldenAngle;

        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius * 0.88;

        // Individual seed stalk direction
        const direction = Math.atan2(sy, sx);

        const stalkLength = 5 + (i % 5) * 0.8;

        const baseX =
            sx + Math.cos(direction) * stalkLength;

        const baseY =
            headY + sy + Math.sin(direction) * stalkLength;

        // Stagger release
        const stagger =
            ((i - firstReleased) / Math.max(releasedCount, 1)) * 0.65;

        const age = Math.max(
            0,
            Math.min(1, (progress - stagger) / (1 - stagger))
        );

        if (age <= 0) continue;

        // Each seed gets its own drifting path
        const driftSpeed = 85 + (i % 11) * 9;
        const flutter = Math.sin(age * 8 + i * 2.1);

        const driftX =
            age * driftSpeed;

        const driftY =
            -age * (20 + (i % 9) * 7) +
            flutter * 10 * age;

        const x = baseX + driftX;
        const y = baseY + driftY;

        // Gentle rotation
        const rotation =
            Math.sin(age * 5 + i * 1.7) * 0.55;

        // Fade only near the end
        const opacity =
            1 - Math.pow(age, 2) * 0.65;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.globalAlpha = opacity;

        // Fine parachute filaments
        const filamentCount = 24;
        const parachuteRadius = 8;

        ctx.strokeStyle = "rgba(245,242,231,0.78)";
        ctx.lineWidth = 0.55;

        for (let j = 0; j < filamentCount; j++) {

            const a =
                (j / filamentCount) * Math.PI * 2;

            // Slightly irregular parachute
            const variation =
                1 + 0.12 * Math.sin(j * 2.4 + i);

            const endX =
                Math.cos(a) * parachuteRadius * variation;

            const endY =
                Math.sin(a) * parachuteRadius * variation;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(
                endX * 0.55,
                endY * 0.55,
                endX,
                endY
            );
            ctx.stroke();
        }

        // Very fine central stalk
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 10);

        ctx.strokeStyle = "rgba(220,215,199,0.8)";
        ctx.lineWidth = 0.65;
        ctx.stroke();

        // Tiny elongated brown achene
        ctx.beginPath();
        ctx.ellipse(
            0,
            12,
            1.15,
            3.1,
            0,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#a18b69";
        ctx.fill();

        // Small darker seed tip
        ctx.beginPath();
        ctx.arc(0, 15, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#6f6049";
        ctx.fill();

        ctx.restore();
    }
}

// ==================================================
// GAME LOOP
// ==================================================

function gameLoop() {

    updateHammer();

    updateDebris();

    updateParticles();

    updateFireworks();

    pageController();

    animationFrameId = requestAnimationFrame(gameLoop);
    // requestAnimationFrame(
    //     gameLoop
    // );
}

gameLoop();