import type { Material, Object3D, Texture } from 'three';

/** Sahnedeki tüm GPU kaynaklarını serbest bırakır (sahne değişiminde bellek sızıntısı olmasın). */
export function disposeObject(root: Object3D) {
  const textures = new Set<Texture>();
  root.traverse((o) => {
    const mesh = o as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && (v as Texture).isTexture) textures.add(v as Texture);
      const uniforms = (m as Material & { uniforms?: Record<string, { value: unknown }> }).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) if (u.value && (u.value as Texture).isTexture) textures.add(u.value as Texture);
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}
