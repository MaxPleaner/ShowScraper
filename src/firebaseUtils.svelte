<script context="module" lang="coffee">
  import { initializeApp } from 'firebase/app';
  import { getDatabase, ref, onValue, get, child } from 'firebase/database';
  import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
  import PubSub from 'pubsub-js'
  # import {  } from "firebase/firestore"

  _firebaseState = {}

  provider = new GoogleAuthProvider()

  firebaseConfig =
    apiKey: "AIzaSyBiC68RVONr8MrNN6032hLHLp2jWh_WD-A",
    authDomain: "shadercam-fabcd.firebaseapp.com",
    databaseURL: "https://shadercam-fabcd-default-rtdb.firebaseio.com",
    projectId: "shadercam-fabcd",
    storageBucket: "shadercam-fabcd.appspot.com",
    messagingSenderId: "225470326967",
    appId: "1:225470326967:web:65cd4f40b8778bbe170532"

  firebaseApp = initializeApp(firebaseConfig)
  db = getDatabase();
  auth = getAuth()

  updateState = (key, val) ->
    _firebaseState[key] = val
    PubSub.publish("firebaseStateUpdated")

  onAuthStateChanged auth, (user) =>
    updateState "user", user
    userShaders = if user then await getUserShaders(user.uid) else {}
    updateState "userShaders", userShaders

  initLogin = ->
    signInWithPopup(auth, provider)

  initLogout = ->
    auth.signOut()

  getUserShaders = (userId) ->
    return [] unless _firebaseState.user
    dbRef = ref(db)
    userShaders = {}
    publicDataSnapshot = await get(child(dbRef, "userShaders/#{userId}/shaders/public"))
    if publicDataSnapshot.exists()
      Object.assign(userShaders, publicDataSnapshot.val())
    if _firebaseState.user.uid == userId
      privateDataSnapshop = await get(child(dbRef, "userShaders/#{userId}/shaders/private"))
      if privateDataSnapshop.exists()
        Object.assign(userShaders, privateDataSnapshop.val())
    return userShaders

  export {
    firebaseApp,
    db,
    initLogin,
    initLogout
    _firebaseState,
    getUserShaders
  }
</script>
