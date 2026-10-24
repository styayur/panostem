import { create } from "zustand";
import { validateMetadata, type SceneMetadata } from "./contracts.ts";

export const useSceneRegistry = create<{
  scenes: SceneMetadata[];
  register: (scene: SceneMetadata) => void;
}>((set) => ({
  scenes: [],
  register: (scene) => {
    validateMetadata(scene);
    set((s) => ({
      scenes: [...s.scenes.filter((x) => x.id !== scene.id), scene].slice(-64),
    }));
  },
}));
