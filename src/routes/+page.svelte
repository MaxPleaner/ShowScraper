<script lang="coffee">

  import * as jQuery from 'jquery';
  import defaultVertShader from "./../../src/default.vert?raw"
  import defaultFragShader from "./../../src/default.frag?raw"
  import p5 from "p5"
  import { onMount } from "svelte"
  import {EditorView, basicSetup} from "codemirror"
  import {StreamLanguage} from "@codemirror/language"
  import {shader} from "@codemirror/legacy-modes/mode/clike"
  import { browser } from '$app/environment'
  import { shaderState, p5Setup, checkShaderError } from "./../../src/shaderUtils.svelte"
  import { firebaseApp, db, initLogin, initLogout, _firebaseState } from "./../../src/firebaseUtils.svelte"
  import PubSub from 'pubsub-js'

  pFive = null
  editorView = null

  firebaseState = _firebaseState
  PubSub.subscribe "firebaseStateUpdated", ->
    firebaseState = _firebaseState

  onMount =>
    pFive = new p5(p5Setup)

    editorView = new EditorView
      extensions: [basicSetup, StreamLanguage.define(shader)],
      parent: document.body

    editorView.dispatch
      changes:
        from: 0,
        to: editorView.state.doc.length,
        insert: defaultFragShader

  updateButtonClick = ->
    fragShader = editorView.state.doc.toString()
    newShaderObj = pFive.createShader(defaultVertShader, fragShader)
    shaderError = checkShaderError(shaderState.shaderObj, fragShader)
    if (shaderError)
      alert(shaderError)
    else
      shaderState.shaderObj = newShaderObj
      pFive.shader(shaderState.shaderObj)

</script>
<container id="page">
  {#if firebaseState.user}
    <p>Logged in as {firebaseState.user.email}</p>
    <button on:click={initLogout} id="logout">Logout</button>
  {:else}
    <button on:click={initLogin} id="login">Login</button>
  {/if}
  <div id="canvas"></div>
  <button on:click={updateButtonClick} id="save">Update</button>
</container>
