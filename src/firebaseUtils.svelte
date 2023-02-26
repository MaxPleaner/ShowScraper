<script context="module" lang="coffee">
  import { initializeApp } from 'firebase/app';
  import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
  import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
  import PubSub from 'pubsub-js'
  import { browser } from '$app/environment'

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
  db = getFirestore(firebaseApp);
  auth = getAuth()

  updateState = (key, val) ->
    _firebaseState[key] = val
    PubSub.publish("firebaseStateUpdated")

  onAuthStateChanged auth, (user) =>
    updateState "user", user

  initLogin = ->
    signInWithPopup(auth, provider)

  initLogout = ->
    auth.signOut()
    # updateState "user", null

  export {
    firebaseApp,
    db,
    initLogin,
    initLogout
    _firebaseState
  }
</script>
