let firestore = firebase.firestore(),
auth = firebase.auth();

let Member = (function () {
	let Uid = Symbol(), Last = Symbol();
  class Member {
    constructor(Userid, Serverid) {
      this[Uid] = Userid;
			this[Last] = "";
			this.Server = new Server_Controller(Serverid);
			this.Auth = new Auth_Controller();
    }
		get Last() {
			return this[Last];
		}
		Last_set(msg) {
			this[Last] = msg;
		}
		// functions
		safetext(text) {
			let table = {
				'<': 'lt',
				'>': 'gt',
				'&': 'amp',
			};
			return text.toString().replace(/[<>&]/g, function(chr){
				return '&' + table[chr] + ';';
			});
		};
		gen_id() {
			let snowid = new FlakeId({
				mid: 42,
				timeOffset: (2013 - 1970) * 31536000 * 1000
			}).gen();
			return snowid.substring(0, snowid.length - 2);
		}
		// time convert
		timeconvert(timestamp) {
			return Math.round(timestamp / 1000).toString();
		}
		timeconvertback (timestamp) {
			let date = new Date(timestamp * 1000);
			return [date.getFullYear(),date.getMonth() + 1,date.getDate(),date.getHours(),date.getMinutes(),date.getSeconds()];
		}
  }
  return Member;
})();
let Server_Controller = (function () {
	let Current_Server = Symbol(),
    Server = Symbol(),
    User = Symbol();
  class Server_Controller {
    constructor(Server_id) {
			this[Current_Server] = Server_id;
			this[Server] = firestore.collection('chatter').doc("servers")
			this[User] = firestore.collection('chatter').doc("users");
    }
		get Current() {
			return this[Current_Server];
		}
		New(name) {
			let id = Chatter.gen_id();
			this[Server].collection(id.toString()).doc("info").set({
				name: name,
				id: id.toString(),
				owner: Chatter.Auth.UserName
			}).catch(error => console.error('Error writing new message to Firebase Database', error));
			this[User].collection(Chatter.Auth.UserName).doc("servers").collection("servers").doc(id).set({
				name: name,
				id: id
			}).catch(error => console.error('Error writing new message to Firebase Database', error));
			serverset();
			this.Switch(id);
		}
		Switch(id) {
			document.querySelectorAll('.active').forEach(Elm => {
        Elm.classList.remove('active');
      });
			this[Current_Server] = id.toString();
			document.getElementById(id).className = "active";
			$("#content").innerHTML = "";
			saveMessagingDeviceToken(true);
      
			loadMessages(this[Current_Server]);
		}
		get Set() {
			this[User].collection(Chatter.Auth.UserName).doc("info").get().then(docSnapshot => {
				if (docSnapshot.exists) {
					this[User].collection(Chatter.Auth.UserName).doc("info").onSnapshot(doc => {
						let usrid = doc.data().id;
						let inhtml = [
						`<a id="settings-sidebar">Settings</a>`, 
						`<a id="${usrid}" onclick="Chatter.Server.Switch(${usrid})">Messages</a>`, 
						`<a id="8914024429258424" onclick="Chatter.Server.Switch(this.id)" class="active">Global</a>`
						];
						this[User].collection(Chatter.Auth.UserName).doc("servers").collection("servers").get().then(querySnapshot => {
							querySnapshot.forEach(doc => {
								inhtml.push(`<a id="${doc.data().id}" onclick="Chatter.Server.Switch(this.id)">${doc.data().name}</a>`);
							});
							$("#sidebar").innerHTML = inhtml.join(",").replace(/,/g, " ");
						});
					});
				} else {
					let usrid = Chatter.gen_id();
					this[User].collection(Chatter.Auth.UserName).doc("info").set({
						name: Chatter.Auth.UserName,
						id: Chatter.gen_id()
					}).catch(error => console.error('Error writing new message to Firebase Database', error));
					let inhtml = [
						`<a id="settings-sidebar">Settings</a>`, 
						`<a id="${usrid}" onclick="Chatter.Server.Switch(this.id)">Messages</a>`, 
						`<a id="8914024429258424" onclick="Chatter.Server.Switch(this.id)" class="active">Global</a>`
					];
					let servs = this[User].collection(Chatter.Auth.UserName).doc("servers").collection("servers");
					servs.get().then(querySnapshot => {
						querySnapshot.forEach(doc => {
							inhtml.push(`<a id="' + doc.data().id + '" onclick="Chatter.Server.Switch(this.id)">' + doc.data().name + '</a>`);
						});
						$("#sidebar").innerHTML = inhtml.join(",").replace(/,/g, " ");
					});
				}
			});
		}
		get Add() {
			let value = $('#serverinput').value;
			this[Server].collection(value).doc("info").get().then((docSnapshot) => {
				if (docSnapshot.exists) {
					let servername = doc.data().name;
					this[User].collection(Chatter.Auth.UserName).doc("servers").collection("servers").doc(id).set({
						name: doc.data().name,
						id: value
					}).catch(error => console.error('Error writing new message to Firebase Database', error));
					this.Set;
					this.Switch(value);
				} else console.log("not exists");
			});
		}
  }
  return Server_Controller;
})();
let Auth_Controller = (function () {
  class Auth_Controller {
    constructor() {}
		//auth
		get signIn() {
			auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(() => {
				auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
			}).catch(error => console.log);
		}
		get signOut() {
			auth.signOut();
		}
		//get functions
		get PicUrl() {
			return auth.currentUser.photoURL || '/images/profile_placeholder.png';
		}
		get UserName() {
			return auth.currentUser.displayName;
		}
		get SignedIn() {
			if (!!auth.currentUser) return true;
			alert('You must sign-in first');
			return false;
		}
		//observer
		StateObserver(user) {
      let signInButtonElement = $('#sign-in');
      let signOutButtonElement = $('#sign-out');
      let userPicElement = $('#user-pic');
      let userNameElement = $('#user-name');
			if (user) {
				userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(auth.currentUser.photoURL || '/images/profile_placeholder.png') + ')';
				userNameElement.textContent = auth.currentUser.displayName;
				userNameElement.removeAttribute('hidden');
				userPicElement.removeAttribute('hidden');
				signOutButtonElement.removeAttribute('hidden');
				signInButtonElement.setAttribute('hidden', 'true');
				Chatter.Server.Set;
				saveMessagingDeviceToken();
			} else {
				userNameElement.setAttribute('hidden', 'true');
				userPicElement.setAttribute('hidden', 'true');
				signOutButtonElement.setAttribute('hidden', 'true');
				signInButtonElement.removeAttribute('hidden');
			}
		}
  }
  return Auth_Controller;
})();

let Chatter = new Member('123456789', '8914024429258424');
auth.onAuthStateChanged(Chatter.Auth.StateObserver);