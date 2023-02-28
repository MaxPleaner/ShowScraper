<script context="module" lang="coffee">
  import { initializeApp } from 'firebase/app';
  import { getDatabase, ref, onValue, get, set, remove, child } from 'firebase/database';
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

  saveShader = (name, shaderText, params, isPublic) ->
    return [null, "Not logged in; cannot save"] unless _firebaseState.user
    if name.length == 0
      return [null, "shader name is empty"]
    if name.includes("/")
      return [null, "shader name cannot contain slashes"]

    bucket = if isPublic then "public" else "private"
    otherBucket = if isPublic then "private" else "public"
    key = "userShaders/#{_firebaseState.user.uid}/shaders/#{bucket}/#{name}"
    removeKey = "userShaders/#{_firebaseState.user.uid}/shaders/#{otherBucket}/#{name}"
    remove(ref(db, removeKey))
    shaderObj = {
      shaderMainText: shaderText,
      paramsJson: JSON.stringify(params)
    }
    set ref(db, key), shaderObj
    return [shaderObj, null]

  deleteShader = (name) ->
    return "Not logged in; cannot delete" unless _firebaseState.user
    ["public", "private"].forEach (bucket) ->
      key = "userShaders/#{_firebaseState.user.uid}/shaders/#{bucket}/#{name}"
      remove(ref(db, key))

  export {
    firebaseApp,
    db,
    initLogin,
    initLogout
    _firebaseState,
    getUserShaders,
    saveShader,
    deleteShader
  }
</script>
