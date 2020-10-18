'use strict';
function saveMessage(messageText, id) {
	Chatter.Last_set(messageText);
	return firestore.collection('chatter').doc("servers").collection(id).doc("messages").collection("messages").add({
		name: Chatter.Auth.UserName,
		text: messageText,
		profilePicUrl: Chatter.Auth.PicUrl,
		time: Chatter.timeconvert(new Date().getTime()),
		timestamp: firebase.firestore.FieldValue.serverTimestamp()
	}).catch(function (error) {
		console.error('Error writing new message to Firebase Database', error);
	});
}
function loadMessages(id) {
	let query;
	if (flag) {
		query = firestore.collection('chatter').doc("servers").collection(id).doc("messages").collection("messages").orderBy("time", "desc");
		query.onSnapshot(function (snapshot) {
			let data = snapshot.docChanges().sort(GetSortOrder());
			data.forEach(function (change, index) {
				let source = change.doc.metadata.hasPendingWrites ? "Local" : "Server";
				if (source == 'Server') {
					if (change.type === 'removed') {
						deleteMessage(change.doc.id);
					} else {
						let message = change.doc.data();
						displayMessage(change.doc.id, message.timestamp, message.name,
							message.text, message.profilePicUrl, last(message.imageUrl));
					}
				}
			});
		});
	} else {
		query = firestore.collection('chatter').doc("servers").collection(id).doc("messages").collection("messages").orderBy("time", "desc").limit(50);
		query.onSnapshot(function (snapshot) {
			let data = snapshot.docChanges().sort(GetSortOrder());
      //console.log(data);
			data.forEach(function (change, index) {
				let source = change.doc.metadata.hasPendingWrites ? "Local" : "Server";
				if (source == 'Server') {
					if (change.type === 'removed') {
						deleteMessage(change.doc.id);
					} else {
						let message = change.doc.data();
						displayMessage(change.doc.id, message.timestamp, message.name,
						message.text, message.profilePicUrl, last(message.imageUrl));
					}
				}
			});
		});
	}
}
async function saveImageMessage(file, id) {
	firebase.storage().ref(`${id}/${auth.currentUser.uid}/${Chatter.gen_id()}/${file.name.replace(/ /g,"_")}`).put(file).then(async function (fileSnapshot) {
		let url = await fileSnapshot.ref.getDownloadURL();
    await sleep(250);
		firestore.collection('chatter').doc("servers").collection(id).doc("messages").collection("messages").add({
			name: Chatter.Auth.UserName,
			imageUrl: url,
			storageUri: fileSnapshot.metadata.fullPath,
			profilePicUrl: Chatter.Auth.PicUrl,
			time: Chatter.timeconvert(new Date().getTime()),
			timestamp: firebase.firestore.FieldValue.serverTimestamp()
		}).catch(function (error) {
			console.error('Error writing new message to Firebase Database', error);
		});
	}).catch(function (error) {
		console.error('There was an error uploading a file to Cloud Storage:', error);
	});
}
function saveMessagingDeviceToken(serv) {
	if (!serv) {
		firebase.messaging().getToken().then(function (currentToken) {
		if (currentToken) {
			firestore.collection('chatter').doc("users").collection(Chatter.Auth.UserName).doc('fcmTokens').collection('fcmTokens').doc(currentToken)
				.set({ uid: auth.currentUser.uid });
			} else {
				requestNotificationsPermissions();
			}
		}).catch(function (error) {
			//console.error('Unable to get messaging token.', error);
		});
	} else {
		firebase.messaging().getToken().then(function (currentToken) {
		if (currentToken) {
			firestore.collection('chatter').doc("servers").collection(Chatter.Server.Current).doc('users').merge({ [Chatter.Auth.UserName]: auth.currentUser.uid });
			} else {
				requestNotificationsPermissions();
			}
		}).catch(function (error) {
			//console.error('Unable to get messaging token for serv.', error);
		});
	}
}
function requestNotificationsPermissions() {
	console.log('Requesting notifications permission...');
	firebase.messaging().requestPermission().then(function () {
		saveMessagingDeviceToken();
	}).catch(function (error) {
		console.error('Unable to get permission to notify.', error);
	});
}
function onMediaFileSelected(event) {
	event.preventDefault();
	let file = event.target.files[0];
	mediaCaptureElement.value = "";
	if (!file.type.match('image.*')) {
		alert('You can only share images');
		return;
	}
	if (Chatter.Auth.SignedIn) {
		saveImageMessage(file, Chatter.Server.Current);
	}
}
function onMessageFormSubmit(e) {
	if (messageInputElement.innerText && Chatter.Auth.SignedIn) {
		firestore.collection('chatter').doc("servers").collection(Chatter.Server.Current).doc("users").get().then(function (doc) {
			if (doc.exists) {
				if (!doc.data().members.includes(Chatter.Auth.UserName)) {
					firebase.messaging().getToken().then(function (currentToken) {
						if (currentToken) {
							let mem = doc.data().members;
							let tok = doc.data().tokens;
							tok.push(currentToken);
							mem.push(Chatter.Auth.UserName);
							firestore.collection('chatter').doc("servers").collection(Chatter.Server.Current).doc("users").set(
								{ members: mem, tokens: tok }, { merge: true })
						} else {
							requestNotificationsPermissions();
						}
					}).catch(function (error) {
						console.error('Unable to get messaging token.', error);
					});
				}
			} else {
				console.log("No such document!");
			}
		}).catch(function (error) {
			console.log("Error getting document:", error);
		});
		saveMessage(messageInputElement.innerText, Chatter.Server.Current).then(function () {
			messageInputElement.innerText = '';
			toggleButton();
		});
	}
}
function addSizeToGoogleProfilePic(url) {
	if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
		return url + '?sz=150';
	}
	return url;
}
function deleteMessage(id) {
	let div = document.getElementById(id);
	if (div) {
		div.parentNode.removeChild(div);
	}
}
async function displayMessage(id, timestamp, name, text, picUrl, imageUrl) {
	let div = document.getElementById(id);
	if (!div) {
		div = document.createElement('div');
		div.innerHTML = `
				<div class="pic"></div>
				<div class="name"></div>
				<div class="message" style="width: ${resize()}px"></div>
		`;
		div.setAttribute('id', id);
		div.setAttribute('timestamp', timestamp);
		let len = messageListElement.children.length;
		let child;
		for (let i = 0; i < len; i++) {
			child = messageListElement.children[i];
			let time = child.getAttribute('timestamp');
			if (time && time > timestamp) {
				break;
			}
		}
		messageListElement.insertBefore(div, child);
	}
	if (picUrl) {
		div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
	}
	div.querySelector('.name').textContent = name;
	let messageElement = div.querySelector('.message');
	if (text) {
		let conv = new showdown.Converter({metadata: true});
		messageElement.innerHTML = conv.makeHtml(text);
	} else if (imageUrl) { 
    await sleep(500);
		let image = document.createElement('img');
		image.addEventListener('load', function () {
			messageListElement.scrollTop = messageListElement.scrollHeight;
		});
		image.style.height = '225px';
    image.src = imageUrl + '&' + new Date().getTime();
		messageElement.innerHTML = '';
		messageElement.appendChild(image);
	}
	setTimeout(function () { div.classList.add('visible') }, 1.75);
	messageListElement.scrollTop = messageListElement.scrollHeight;
	messageInputElement.focus();
}
function toggleButton(e) {
	try {
		if (e.shiftKey != undefined) {
			if (e.keyCode == 13 && !/\S/.test(messageInputElement.innerText)) {
				messageInputElement.innerText = '';
			}
			if (messageInputElement.innerText.includes(" @") || messageInputElement.innerText.charAt(0) == "@") {
				let val = messageInputElement.innerText.slice(0, e.target.selectionStart);
				let flipval = val.reverse();
				if (flipval.indexOf(" ") == -1) {
					val = flipval.reverse();
				} else {
					val = flipval.slice(0, flipval.indexOf(" ")).reverse();
				}
				if (val.charAt(0) == "@") {
					firestore.collection('chatter').doc("servers").collection(Chatter.Server.Current).doc("users").get().then(function (doc) {
						if (doc.exists) {
							let arr = [];
							doc.data().members.forEach(function (member) {
                stringSimilarity.compareTwoStrings('what!', 'who?');
								if (member.split(" ").join("").includes(val.slice(1))) {
									arr.push(member)
								}
							});
							console.log(arr)
						} else {
							console.log("No such document!");
						}
					}).catch(function (error) {
						console.log("Error getting document:", error);
					});
				}
			}
		}
	} catch (err) { };
	if (messageInputElement.innerText && /\S/.test(messageInputElement.innerText)) {
		if (e.keyCode == 13 && !e.shiftKey) {
			onMessageFormSubmit();
		}
		submitButtonElement.removeAttribute('disabled');
	} else {
		submitButtonElement.setAttribute('disabled', 'true');
		if (e) {
			if (e.keyCode == 38 && !messageInputElement.innerText.trim().length) {
				messageInputElement.innerText = Chatter.Last;
			}
		}
	}
}
function checkSetup() {
	if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
		window.alert('You have not configured and imported the Firebase SDK. ' +
			'Make sure you go through the codelab setup instructions and make ' +
			'sure you are running the codelab using `firebase serve`');
	}
}
let resize = () => {
	return messageListElement.clientWidth + 50;
};
checkSetup();


let imageButtonElement = document.getElementById('attach');
let mediaCaptureElement = document.getElementById('mediaCapture');
let messageInputElement = document.getElementById('msg-input');
let submitButtonElement = document.getElementById('submit');
let messageListElement = document.getElementById("content");


messageInputElement.addEventListener('keyup', toggleButton);
messageInputElement.addEventListener('change', toggleButton);
mediaCaptureElement.addEventListener('change', onMediaFileSelected);

let flag = false;

firebase.performance();

loadMessages(Chatter.Server.Current);