let players = [];
let playersOut = [];
const gridSize = 9;

let ws;
let room;
let turn = "me";
let username;
let selected;
let piecesResolved = [];

function send (json) {

	ws.send(JSON.stringify({
	
		player: username,
		...json
		
	}));

}

function colorFromString (str) {

	var hash = 0;
	for (var i = 0; i < str.length; i++) {
	
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	
	}

	var color = "#";
	
	for (var i = 0; i < 3; i++) {
	
		var value = (hash >> (i * 8)) & 0xFF;
		color += ("00" + value.toString(16)).substr(-2);
	
	}

	return color;

}

function isHexLight (color) {
	
	const hex = color.replace("#", "");
	const c_r = parseInt(hex.substr(0, 2), 16);
	const c_g = parseInt(hex.substr(2, 2), 16);
	const c_b = parseInt(hex.substr(4, 2), 16);
	const brightness = ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
	return brightness > 155;

}

function updateTurn () {

	if (document.querySelector(".playing")) document.querySelector(".playing").classList.remove("playing");
	document.querySelector(`#player_list .owner-${turn === "me" ? username : turn}`).classList.add("playing");

}

class Piece {

	constructor (x, y, type, value, owner) {

		this.x = x;
		this.y = y;

		this.type = type;
		this.value = value;
		this.owner = owner;

	}

}

class Grid {

	constructor () {

		this.pieces = [];

	}

	myPieces () {

		return this.pieces.filter(_ => _.owner === "me");

	}

	_placePiece (piece) {

		const el = document.createElement("div");
		const span = document.createElement("span");

		if (document.querySelector(`*[data-x='${piece.x}'][data-y='${piece.y}']>*`)) document.querySelector(`*[data-x='${piece.x}'][data-y='${piece.y}']>*`).remove();

		span.innerText = piece.value;

		el.appendChild(span);
		el.classList.add(`type-${piece.type}`);
		el.classList.add(`owner-${piece.owner}`);

		document.querySelector(`*[data-x='${piece.x}'][data-y='${piece.y}']`).appendChild(el);

		if (piece.owner === "me") {

			el.addEventListener("click", event => {

				if (document.querySelector(".selected")) document.querySelector(".selected").classList.remove("selected");
				selected = piece;
				el.classList.add("selected");
				document.getElementById("mod_b").value = piece.value;
				changeMod();
	
			});

			el.addEventListener("mouseover", event => {

				document.getElementById("mod_a").value = piece.value;
				changeMod();
	
			});

		}

		return el;

	}

	addPiece (piece) {

		if (piece.owner === "me") {

			send({

				type: "addPiece",
				piece

			});

		}

		this.removePiece(piece);
		this.pieces.push(piece);

		return this._placePiece(piece);

	}

	getPieceAt (x, y) {

		return this.pieces.find(_ => _.x === x && _.y === y);		

	}

	removePiece (piece) {

		const ei = this.pieces.findIndex(_ => _.x === piece.x && _.y === piece.y);
		if (ei === -1) return;
		
		document.querySelector(`*[data-x='${piece.x}'][data-y='${piece.y}']>*`).remove();
		this.pieces.splice(ei, 1);

	}

	_canMoveTo (x1, y1, x2, y2) {

		return Math.floor(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)) <= 1;

	}

	movePiece (x1, y1, x2, y2) {

		if (!this._canMoveTo(x1, y1, x2, y2) || (x1 === x2 && y1 === y2)) return;

		const piece = this.getPieceAt(x1, y1);

		if (this.getPieceAt(x2, y2)) {

			const toPiece = this.getPieceAt(x2, y2);

			if (toPiece.value <= 12 || toPiece.value >= piece.value) {

				if (!(toPiece.value % piece.value) || (toPiece.value <= 12 && piece.value > toPiece.value)) {

					if (toPiece.type === "cm") {

						playersOut.push(toPiece.owner === "me" ? username : toPiece.owner);					
						updatePlayers();

					}

					this.removePiece(toPiece);

				} else {

					toPiece.value = toPiece.value % piece.value;
					this._placePiece(toPiece);
					return true;
					
				}

			} else return;

		}

		piece.x = x2;
		piece.y = y2;
		document.querySelector(`*[data-x='${x1}'][data-y='${y1}']>*`).remove();

		this._placePiece(piece);
		return true;

	}

}

const grid = new Grid();

function generateRandomNumber () {

	return Math.round(((Math.random() + 0.5) * 10) ** 2);

}

function setupGrid () {

	let gridEl = document.getElementById("grid");

	let i = 0;
	for (let y = 0; y < gridSize; y++) {
		
		const row = document.createElement("div");

		for (let x = 0; x < gridSize; x++) {
		
			const square = document.createElement("div");
			square.setAttribute("data-x", x);
			square.setAttribute("data-y", y);

			if (!((i + 1) % 2)) square.classList.add("even");

			row.appendChild(square);
			i++;

		}

		gridEl.appendChild(row);

	}

}

function setupPieces () {

	let cmX;
	let cmY;

	if (players.length === 1) {
		
		cmX = 1
		cmY = 1

	} else if (players.length === 3) {
		
		cmX = gridSize - 2
		cmY = 1

	} else if (players.length === 2) {
		
		cmX = gridSize - 2
		cmY = gridSize - 2

	} else if (players.length === 4) {
		
		cmX = 1
		cmY = gridSize - 2

	}

	grid.addPiece(new Piece(cmX, cmY, "cm", generateRandomNumber(), "me"));
	
	grid.addPiece(new Piece(cmX - 1, cmY - 1, "p", generateRandomNumber(), "me"));
	grid.addPiece(new Piece(cmX - 1, cmY + 1, "p", generateRandomNumber(), "me"));
	grid.addPiece(new Piece(cmX + 1, cmY - 1, "p", generateRandomNumber(), "me"));
	grid.addPiece(new Piece(cmX + 1, cmY + 1, "p", generateRandomNumber(), "me"));

	grid.addPiece(new Piece(cmX + 1, cmY, "p", generateRandomNumber(), "me"));
	grid.addPiece(new Piece(cmX - 1, cmY, "p", generateRandomNumber(), "me"));
	grid.addPiece(new Piece(cmX, cmY + 1, "p", generateRandomNumber(), "me"));
	grid.addPiece(new Piece(cmX, cmY - 1, "p", generateRandomNumber(), "me"));

}

function winner (who) {

	document.getElementById("winner").style.display = "block";
	document.getElementById("winner_text").innerText = `${who} has won it all!`;

}

function updatePlayers () {

	let s = "";
	[...document.querySelectorAll("#player_list>*")].map(_ => _.remove());
	for (const p of players) {

		const pl = document.createElement("div");
		pl.innerHTML = `<p class="owner-${p}${playersOut.indexOf(p) === -1 ? "" : " out"}">${p}</p>`;
		document.getElementById("player_list").appendChild(pl);

		if (p !== username) s += `.owner-${p} {background-color: ${colorFromString(p)};}\n.owner-${p}, .owner-${p}>* {${isHexLight(colorFromString(p)) ? `` : `color: white;`}}\n`

	}
	document.getElementById("game_styles").innerHTML = s;
	updateTurn();

}

const login = spectating => {

	room = document.getElementById(spectating ? "spectate_room_name" : "room").value;
	if (!spectating) username = document.getElementById("username").value;
	else username = Math.random().toString(36);

	if (room.length < 3 || username.length < 3) return;

	ws = new WebSocket("wss://privatesuitemag.com:8080", room);

	document.getElementById("join").remove();

	ws.onopen = () => {

		send({

			type: "hi",
			spectating: !!spectating

		});

		if (!spectating) {

			setTimeout(() => {

				if (players.length === 0) {
					
					players.push(username);
					updatePlayers();
					updateTurn();

				}

				setupPieces();
		
			}, 250);

		}

	}

	ws.onmessage = event => {

		const msg = JSON.parse(event.data);

		if (msg.type === "hi") {

			if (!msg.spectating) {
			
				players.push(msg.player);
				updatePlayers();

			}

			send({

				type: "players",
				players

			});

			send({

				type: "myPieces",
				pieces: grid.myPieces()
				
			});

			if (turn === "me") {

				send({

					type: "myTurn"

				});

			}

		} else if (msg.type === "players") {

			players = msg.players;
			updatePlayers();

		} else if (msg.type === "addPiece") {

			grid.addPiece(new Piece(msg.piece.x, msg.piece.y, msg.piece.type, msg.piece.value, msg.player));

		} else if (msg.type === "myPieces") {

			if (piecesResolved.indexOf(msg.player) === -1) {

				piecesResolved.push(msg.player);
				for (const piece of msg.pieces) {

					grid.addPiece(new Piece(piece.x, piece.y, piece.type, piece.value, msg.player));

				}

			}

		} else if (msg.type === "myTurn") {

			turn = msg.player;
			updateTurn();

		} else if (msg.type === "movePiece") {

			grid.movePiece(msg.x1, msg.y1, msg.x2, msg.y2);

		} else if (msg.type === "setTurn") {

			turn = msg.who;
			if (turn === username) turn = "me";
			updateTurn();

		} else if (msg.type === "win") {

			winner(msg.who);

		}

	}

}

document.getElementById("join_room").addEventListener("click", login);
document.getElementById("spectate_room").addEventListener("click", () => login(true));
document.getElementById("join").addEventListener("keydown", event => {

	if (event.key === "Enter") login();

});

document.getElementById("grid").addEventListener("contextmenu", event => {

	if (selected && turn === "me") {

		const to = event.target.closest("*[data-x]");
		send({

			type: "movePiece",
			x1: selected.x,
			y1: selected.y,
			x2: parseInt(to.getAttribute("data-x")),
			y2: parseInt(to.getAttribute("data-y"))

		});
		if (grid.movePiece(selected.x, selected.y, parseInt(to.getAttribute("data-x")), parseInt(to.getAttribute("data-y")))) {

			selected = undefined;
			turn = players[(players.indexOf(username) + 1) % players.length];

			let i = 0;
			while (playersOut.indexOf(turn) !== -1 && i !== 10) {
				
				turn = players[(players.indexOf(username) + 1) % players.length];
				i++;

			}

			if (i === 10 || players.length - playersOut.length === 1) {

				winner(players.find(_ => playersOut.indexOf(_) === -1));
				send({

					type: "win",
					who: players.find(_ => playersOut.indexOf(_) === -1)

				})
				return;

			}

			if (turn === username) turn = "me";
			updateTurn();

			send({

				type: "setTurn",
				who: turn

			});

		}

	}

	event.preventDefault();
	return false;

});

function changeMod () {

	try {

		document.getElementById("mod_c").value = parseInt(document.getElementById("mod_a").value) % parseInt(document.getElementById("mod_b").value);
		if (document.getElementById("mod_c").value === "NaN") {

			document.getElementById("mod_c").value = "";

		}

	} catch (e) {

		document.getElementById("mod_c").value = "";

	}

}

document.getElementById("mod_a").addEventListener("input", changeMod);
document.getElementById("mod_b").addEventListener("input", changeMod);

setupGrid();
