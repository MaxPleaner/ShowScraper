<script context="module" lang="coffee">
  import defaultVertShader from "./default.vert?raw"
  import defaultFragShader from "./default.frag?raw"

  shaderState =
    shaderObj: null
    cam: null

  p5Setup = (pFive) =>
    pFive.setup = ->
      canvas = pFive.createCanvas(710, 400, pFive.WEBGL)
      canvas.parent("canvas")
      pFive.noStroke()
      shaderState.cam = pFive.createCapture(pFive.VIDEO)
      shaderState.cam.size(710, 400)
      shaderState.cam.hide()
      shaderState.shaderObj = pFive.createShader(
        defaultVertShader,
        defaultFragShader
      )
      pFive.shader(shaderState.shaderObj)

    pFive.draw = ->
      shaderState.shaderObj.setUniform('tex0', shaderState.cam)
      pFive.rect(0,0,100,100)

  checkShaderError = (newShaderObj, shaderText) ->
    gl = newShaderObj._renderer.GL
    glFragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(glFragShader, shaderText)
    gl.compileShader(glFragShader)
    if !gl.getShaderParameter(glFragShader, gl.COMPILE_STATUS)
      return gl.getShaderInfoLog(glFragShader)
    return null

  export {
    p5Setup,
    checkShaderError,
    shaderState,
  }
</script>
