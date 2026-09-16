/**
 * @author Space.js React
 *
 * Three.js material, texture, light and object panel definitions.
 *
 * Each export is a pure function returning `<Panel>` item descriptors, so a
 * panel is composed as data and rendered declaratively:
 *
 * @example
 * <Point3D object={mesh} name={mesh.geometry.type}>
 *     <Point3DPanel items={materialsPanelItems(mesh, panelUi)} />
 * </Point3D>
 */

export { ambientLightPanelItems } from './lights/ambientLightPanel.js';
export { directionalLightPanelItems } from './lights/directionalLightPanel.js';
export { hemisphereLightPanelItems } from './lights/hemisphereLightPanel.js';
export { LightOptions, LightPanelController, getKeyByLight } from './lights/lightPanelController.js';
export { pointLightPanelItems } from './lights/pointLightPanel.js';
export { rectAreaLightPanelItems } from './lights/rectAreaLightPanel.js';
export { spotLightPanelItems } from './lights/spotLightPanel.js';
export { basicMaterialCommonPanelItems } from './materials/basicMaterialCommonPanel.js';
export { BasicMaterialOptions, basicMaterialPanelItems } from './materials/basicMaterialPanel.js';
export { lambertMaterialCommonPanelItems } from './materials/lambertMaterialCommonPanel.js';
export { LambertMaterialOptions, lambertMaterialPanelItems } from './materials/lambertMaterialPanel.js';
export { matcapMaterialCommonPanelItems } from './materials/matcapMaterialCommonPanel.js';
export { MatcapMaterialOptions, matcapMaterialPanelItems } from './materials/matcapMaterialPanel.js';
export { MaterialProperties } from './materials/materialProperties.js';
export { MaterialOptions, getKeyByMaterial, materialsPanelItems } from './materials/materialsPanel.js';
export { normalMaterialCommonPanelItems } from './materials/normalMaterialCommonPanel.js';
export { NormalMaterialOptions, normalMaterialPanelItems } from './materials/normalMaterialPanel.js';
export { phongMaterialCommonPanelItems } from './materials/phongMaterialCommonPanel.js';
export { PhongMaterialOptions, phongMaterialPanelItems } from './materials/phongMaterialPanel.js';
export { physicalMaterialAnisotropyPanelItems } from './materials/physicalMaterialAnisotropyPanel.js';
export { physicalMaterialClearcoatNormalPanelItems } from './materials/physicalMaterialClearcoatNormalPanel.js';
export { physicalMaterialClearcoatPanelItems } from './materials/physicalMaterialClearcoatPanel.js';
export { physicalMaterialClearcoatRoughnessPanelItems } from './materials/physicalMaterialClearcoatRoughnessPanel.js';
export { physicalMaterialCommonPanelItems } from './materials/physicalMaterialCommonPanel.js';
export { physicalMaterialEnvPanelItems } from './materials/physicalMaterialEnvPanel.js';
export { physicalMaterialIridescencePanelItems } from './materials/physicalMaterialIridescencePanel.js';
export { physicalMaterialIridescenceThicknessPanelItems } from './materials/physicalMaterialIridescenceThicknessPanel.js';
export { PhysicalMaterialOptions, physicalMaterialPanelItems } from './materials/physicalMaterialPanel.js';
export { physicalMaterialSheenColorPanelItems } from './materials/physicalMaterialSheenColorPanel.js';
export { physicalMaterialSheenPanelItems } from './materials/physicalMaterialSheenPanel.js';
export { physicalMaterialSheenRoughnessPanelItems } from './materials/physicalMaterialSheenRoughnessPanel.js';
export { physicalMaterialSpecularColorPanelItems } from './materials/physicalMaterialSpecularColorPanel.js';
export { physicalMaterialSpecularIntensityPanelItems } from './materials/physicalMaterialSpecularIntensityPanel.js';
export { physicalMaterialSpecularPanelItems } from './materials/physicalMaterialSpecularPanel.js';
export { physicalMaterialTransmissionIntensityPanelItems } from './materials/physicalMaterialTransmissionIntensityPanel.js';
export { physicalMaterialTransmissionPanelItems } from './materials/physicalMaterialTransmissionPanel.js';
export { physicalMaterialTransmissionThicknessPanelItems } from './materials/physicalMaterialTransmissionThicknessPanel.js';
export { standardMaterialCommonPanelItems } from './materials/standardMaterialCommonPanel.js';
export { StandardMaterialOptions, standardMaterialPanelItems } from './materials/standardMaterialPanel.js';
export { toonMaterialCommonPanelItems } from './materials/toonMaterialCommonPanel.js';
export { ToonMaterialOptions, toonMaterialPanelItems } from './materials/toonMaterialPanel.js';
export { instancedMeshPanelItems } from './objects/instancedMeshPanel.js';
export { BackgroundMappingOptions, ColorSpaceOptions, CombineOptions, DisplayOptions, FlatShadingOptions, FogOptions, HelperOptions, InstanceOptions, NormalMapOptions, RefractionMappingOptions, SideOptions, ToneMappedOptions, VisibleOptions, WireframeOptions, WrapOptions } from './options.js';
export { MaterialPanels, MaterialPatches } from './patches.js';
export { subPanel } from './subPanel.js';
export { alphaMapPanelItems } from './textures/alphaMapPanel.js';
export { aoMapPanelItems } from './textures/aoMapPanel.js';
export { backgroundMapPanelItems } from './textures/backgroundMapPanel.js';
export { bumpMapPanelItems } from './textures/bumpMapPanel.js';
export { displacementMapPanelItems } from './textures/displacementMapPanel.js';
export { emissiveMapPanelItems } from './textures/emissiveMapPanel.js';
export { envMapPanelItems } from './textures/envMapPanel.js';
export { environmentMapPanelItems } from './textures/environmentMapPanel.js';
export { gradientMapPanelItems } from './textures/gradientMapPanel.js';
export { lightMapPanelItems } from './textures/lightMapPanel.js';
export { mapPanelItems } from './textures/mapPanel.js';
export { getBallThumbnail, getThumbnail } from './textures/mapPanelUtils.js';
export { matcapMapPanelItems } from './textures/matcapMapPanel.js';
export { metalnessMapPanelItems } from './textures/metalnessMapPanel.js';
export { normalMapPanelItems } from './textures/normalMapPanel.js';
export { roughnessMapPanelItems } from './textures/roughnessMapPanel.js';
export { specularMapPanelItems } from './textures/specularMapPanel.js';
export { textureMapPanelItems } from './textures/textureMapPanel.js';
export { setPanelTexture } from './textures/texturePanelUtils.js';
