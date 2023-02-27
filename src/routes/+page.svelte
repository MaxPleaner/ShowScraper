<script lang="coffee">

  import * as jQuery from 'jquery';
  import defaultVertShader from "./../../src/default.vert?raw"
  import p5 from "p5"
  import { onMount } from "svelte"
  import {EditorView, basicSetup} from "codemirror"
  import {StreamLanguage} from "@codemirror/language"
  import {shader} from "@codemirror/legacy-modes/mode/clike"
  import { browser } from '$app/environment'
  import {
    shaderState, p5Setup, checkShaderError, DefaultShader, buildAndValidateShader,
  } from "./../../src/shaderUtils.svelte"
  import {
    firebaseApp, db, initLogin, initLogout, _firebaseState, getUserShaders
  } from "./../../src/firebaseUtils.svelte"
  import PubSub from 'pubsub-js'

  pFive = null
  editorView = null
  params = []

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
        insert: DefaultShader

  updateButtonClick = ->
    tryUseShader(editorView.state.doc.toString(), params)

  saveButtonClick = ->
    tryUseShader(editorView.state.doc.toString(), params)

  deleteButtonClick = ->

  tryUseShader = (shaderText, params) ->
    jQuery("[data-tab='cameraTab']").trigger("click")
    [newShaderObj, shaderError] = buildAndValidateShader(shaderText, params)
    if (shaderError)
      alert(shaderError)
    else
      shaderState.shaderObj = newShaderObj
      pFive.shader(shaderState.shaderObj)

  switchTab = ->
    button = jQuery(this)
    jQuery(".nav-btn").removeClass("selected")
    button.addClass("selected")
    id = "##{button.data("tab")}"
    tab = jQuery(id)
    jQuery(".tab").addClass("hidden")
    tab.removeClass("hidden")

  loadShader = (name, shaderData) ->
    editorView.dispatch
      changes:
        from: 0,
        to: editorView.state.doc.length,
        insert: shaderData.shaderMainText
    params = JSON.parse(shaderData.paramsJson)
    jQuery("#shader-name").val(name)
    tryUseShader(shaderData.shaderMainText, params)

  clearShader = ->
    loadShader "",
      shaderMainText: DefaultShader,
      paramsJson: JSON.stringify([])

</script>
<container id="page">
  {#if firebaseState.user}
    <span>Logged in as {firebaseState.user.email}</span>
    <button on:click={initLogout} id="logout">Logout</button>
  {:else}
    <button on:click={initLogin} id="login">Login</button>
  {/if}
  <hr>
  <div id="tab-nav">
    <button class="nav-btn selected" on:click={switchTab} data-tab="cameraTab">Camera</button>
    <button class="nav-btn" on:click={switchTab} data-tab="shadersTab">Shaders</button>
  </div>
  <hr>
  <div id="tabs">
    <div class="tab" id="cameraTab">
      <div id="canvas"></div>
    </div>
    <div class="tab hidden" id="shadersTab">
      <a href="#" on:click={clearShader}>Clear Active Shader</a>
      <ul>
        {#each Object.entries(firebaseState.userShaders || {}) as [name, shaderData]}
          <li><button on:click={loadShader(name, shaderData)}>{name}</button>
        {/each}
      </ul>
    </div>
  </div>
  <hr>
  <input id="shader-name" type="text" placeholder="Shader name" />
  <button on:click={updateButtonClick} id="update">Update Preview</button>
  <button on:click={saveButtonClick} id="save">Save</button>
  <button on:click={deleteButtonClick} id="delete">Delete</button>
</container>

<style>
  .hidden {
    display: none;
  }

  .nav-btn.selected {
    outline: 3px solid lightblue;
  }
</style>
