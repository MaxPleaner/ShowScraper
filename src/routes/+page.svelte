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
    firebaseApp, db, initLogin, initLogout, _firebaseState, getUserShaders,
    saveShader, deleteShader
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
      parent: jQuery("#editorWrapper")[0]

    editorView.dispatch
      changes:
        from: 0,
        to: editorView.state.doc.length,
        insert: DefaultShader

  updateButtonClick = ->
    tryUseShader(editorView.state.doc.toString(), params)

  saveButtonClick = ->
    shaderText = editorView.state.doc.toString()
    tryUseShader(shaderText, params)
    name = jQuery("#shader-name").val()
    console.log("TODO: public/private toggle")
    isPublic = jQuery("#isPublic")[0].checked
    [shaderObj, error] = await saveShader(name, shaderText, params, isPublic)
    if error
      alert(error)
    else
      alert("saved")
      firebaseState.userShaders[name] = shaderObj

  deleteButtonClick = ->
    return unless confirm "are you sure?"
    name = jQuery("#shader-name").val()
    err = deleteShader(name)
    return alert(err) if err
    delete firebaseState.userShaders[name]
    firebaseState.userShaders = firebaseState.userShaders
    alert("deleted")
    clearShader()

  tryUseShader = (shaderText, params) ->
    jQuery("[data-tab='cameraTab']").trigger("click")
    [newShaderObj, shaderError] = buildAndValidateShader(shaderText, params)
    if (shaderError)
      alert(shaderError)
      false
    else
      shaderState.shaderObj = newShaderObj
      pFive.shader(shaderState.shaderObj)
      true

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
    shaderState.paramValues = {}
    jQuery("#shader-name").val(name)
    success = tryUseShader(shaderData.shaderMainText, params)
    params.forEach (param) ->
      shaderState.paramValues[param.paramName] =
        type: "float",
        val: param.default

  clearShader = ->
    loadShader "",
      shaderMainText: DefaultShader,
      paramsJson: JSON.stringify([])

  clearShaderOnClick = ->
    clearShader()
    alert("cleared")

  updateParamName = ->
    input = jQuery(this)
    oldName = input.data("param-name")
    newName = input.val()
    oldParam = params.find (param) -> param.paramName == oldName
    oldParam.paramName = newName
    params = params
    jQuery("[data-param-name='#{oldName}']").data("param-name", newName)
    oldVal = shaderState.paramValues[oldName]
    delete shaderState.paramValues[oldName]
    shaderState.paramValues[newName] = oldVal

  addParam = ->
    console.log("TODO: make param types compatible with app")
    params.push
      paramName: "",
      type: "FOO.BAR.FloatShaderParam",
      default: 1.0,
      min: 0.0,
      max: 10.0,
    params = params
    shaderState.paramValues[""] =
      type: "float",
      val: 1.0

  deleteParam = ->
    return unless confirm("are you sure?")
    field = jQuery(this)
    paramName = field.data("param-name")
    delete shaderState.paramValues[paramName]
    params = params.filter (param) -> param.paramName != paramName

  floatParamDirectSet = ->
    field = jQuery(this)
    paramName = field.data("param-name")
    slider = jQuery(".float-param-slider[data-param-name='#{paramName}']")
    slider.val(field.val())
    shaderState.paramValues[paramName] = {
      type: "float",
      val: field.val()
    }

  floatParamMinChanged = ->
    field = jQuery(this)
    paramName = field.data("param-name")
    param = params.find (param) -> param.paramName == paramName
    param.min = field.val()
    params = params

  floatParamDefaultChanged = ->
    field = jQuery(this)
    paramName = field.data("param-name")
    param = params.find (param) -> param.paramName == paramName
    param.default = field.val()
    params = params
    shaderState.paramValues[paramName].val = field.val()

  floatParamMaxChanged = ->
    field = jQuery(this)
    paramName = field.data("param-name")
    param = params.find (param) -> param.paramName == paramName
    param.max = field.val()
    params = params

  floatParamSliderChanged = ->
    field = jQuery(this)
    paramName = field.data("param-name")
    directSetField = jQuery(".float-param-val-direct-set[data-param-name='#{paramName}']")
    directSetField.val(field.val())
    shaderState.paramValues[paramName] = {
      type: "float",
      val: field.val()
    }

</script>
<container id="page">

  <!-- ACCOUNTS STUFF -->
  {#if firebaseState.user}
    <span>Logged in as {firebaseState.user.email}</span>
    <button on:click={initLogout} id="logout">Logout</button>
  {:else}
    <button on:click={initLogin} id="login">Login</button>
  {/if}
  <hr>

  <!-- NAV BUTTONS -->
  <div id="tab-nav">
    <button class="nav-btn selected" on:click={switchTab} data-tab="cameraTab">Camera</button>
    <button class="nav-btn" on:click={switchTab} data-tab="shadersTab">Shaders</button>
  </div>
  <hr>

  <div id="tabs">

    <!-- CAMERA VIEW -->
    <div class="tab" id="cameraTab">
      <div id="canvas"></div>
      <input id="shader-name" type="text" placeholder="Shader name" />
      <button on:click={updateButtonClick} id="update">Update Preview</button>
      <button on:click={saveButtonClick} id="save">Save</button>
      <button on:click={deleteButtonClick} id="delete">Delete</button>
      <br>
      <label for="isPublic">Public</label>
      <input type="checkbox" id="isPublic" checked="checked" value="Public" />
      <br>
      <a href="#" on:click={clearShaderOnClick}>Clear Active Shader</a>
      <!-- EDITOR -->
      <div id="params">
        <!-- PARAM EDITOR -->
        <p>Parameters</p>
        <button on:click={addParam} class="add-param">Add Parameter</button>
        <ol>
          {#each params as param}
            <li class="shaderParam">
              <input
                type="text"
                class="paramName"
                data-param-name={param.paramName}
                value={param.paramName}
                placeholder="param name"
                on:change={updateParamName}
              />
              ({param.type.split(".").slice(-1)[0]})
              <b>Value:
                <input
                  class="float-param-val-direct-set small-number-input"
                  data-param-name={param.paramName}
                  type="number"
                  step="0.01"
                  value={param.default || 1.0}
                  on:change={floatParamDirectSet}
                />
              </b>
              <b>Default:
                <input
                  class="float-param-default small-number-input"
                  data-param-name={param.paramName}
                  type="number"
                  step="0.01"
                  value={param.default || 1.0}
                  on:change={floatParamDefaultChanged}
                />
              </b>
              <b>Min:
                <input
                  class="float-param-min small-number-input"
                  data-param-name={param.paramName}
                  type="number"
                  step="0.01"
                  value={param.min || 0.0}
                  on:change={floatParamMinChanged}
                />
              </b>
              <b>Max:
                <input
                  class="float-param-max small-number-input"
                  data-param-name={param.paramName}
                  type="number"
                  step="0.01"
                  value={param.max || 0.0}
                  on:change={floatParamMaxChanged}
                />
              </b>
              <input
                class="float-param-slider"
                data-param-name={param.paramName}
                type="range"
                step="0.01"
                min={param.min || 0.0}
                max={param.max || 1.0}
                value={param.default || 1.0}
                on:input={floatParamSliderChanged}
              />
              <button on:click={deleteParam} class="delete-param" data-param-name={param.paramName}>Delete</button>
            </li>
          {/each}
        </ol>
      </div>
      <div id="editorWrapper"></div>
    </div>

    <!-- SHADER LIST -->
    <div class="tab hidden" id="shadersTab">
      <ul>
        {#if Object.keys(firebaseState.userShaders || {}).length == 0}
          <p>No saved shaders found.</p>
        {:else}
          {#each Object.entries(firebaseState.userShaders || {}) as [name, shaderData]}
            <li><button on:click={loadShader(name, shaderData)}>{name}</button>
          {/each}
        {/if}
      </ul>
    </div>

  </div>
  <hr>
</container>

<style>
  .hidden {
    display: none;
  }

  .inline-block {
    display: inline-block;
  }

  .small-number-input {
    width: 50px;
  }

  .nav-btn.selected {
    outline: 3px solid lightblue;
  }
</style>
