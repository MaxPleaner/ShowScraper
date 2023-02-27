<script context="module" lang="coffee">
  import defaultVertShader from "./default.vert?raw"

  shaderState =
    shaderObj: null
    cam: null

  DefaultShader = """
    vec3 image(vec2 uv, vec3 color) {
      return color;
    }
  """

  pFive = null

  p5Setup = (_pFive) =>
    pFive = _pFive
    pFive.setup = ->
      canvas = pFive.createCanvas(710, 400, pFive.WEBGL)
      canvas.parent("canvas")
      pFive.noStroke()
      shaderState.cam = pFive.createCapture(pFive.VIDEO)
      shaderState.cam.size(710, 400)
      shaderState.cam.hide()
      shaderState.shaderObj = pFive.createShader(
        defaultVertShader,
        buildShader(DefaultShader, [])
      )
      pFive.shader(shaderState.shaderObj)

    pFive.draw = ->
      shaderState.shaderObj.setUniform('tex0', shaderState.cam)
      shaderState.shaderObj.setUniform('iResolution',[710, 400])
      pFive.rect(0,0,100,100)

  buildShader = (shaderText, params) ->
    paramsString = params.map (param) ->
      paramClass = param.type.split(".").slice(-1)[0]
      uniformType = {
        "FloatShaderParam": "float",
        "ColorShaderParam": "vec3",
        "TextureShaderParam": "sampler2D"
      }[paramClass]
      "uniform #{uniformType} #{param.paramName};"
    .join("\n")

    """
      precision mediump float;
      varying vec2 vTexCoord; // grab texcoords from vert shader
      uniform sampler2D tex0; // our texture coming from p5
      uniform vec2 iResolution;

      vec3 sampleCamera(vec2 uv) {
        return texture2D(tex0, uv).rgb;
      }

      #{paramsString}
      #{shaderText}

      void main() {
          vec2 uv = vTexCoord;
          uv.x = 1.0 - uv.x;
          uv.y = 1.0 - uv.y;
          vec4 tex = texture2D(tex0, uv);
          vec3 finalRGB = image(uv, tex.rgb);
          gl_FragColor = vec4(finalRGB, 1.0);
      }
    """

  buildAndValidateShader = (shaderText, params) ->
    console.log(params)
    finalShaderText = buildShader(shaderText, params)
    newShaderObj = pFive.createShader(defaultVertShader, finalShaderText)
    shaderError = checkShaderError(shaderState.shaderObj, finalShaderText)
    [newShaderObj, shaderError]


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
    DefaultShader,
    buildAndValidateShader
  }
</script>
