<template>
  <Tile :title="'Admin'" :status="status" :subtitle="subtitle" width="half">
    <p>{{ message }}</p>
    <div class="button-row">
      <a v-if="canOpenAdmin" class="button" href="/api/admin">Open Admin</a>
    </div>
  </Tile>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import Tile from "./Tile.vue";
type TileStatus = "Success" | "Error" | "Warning" | "Info" | "Loading";

const status = ref<TileStatus>("Loading");
const canOpenAdmin = ref(false);

const subtitle = computed(() =>
  status.value === "Error" ? "There seems to be an issue" : "",
);
const message = computed(() =>
  status.value === "Success"
    ? "Remult Admin is an autogenerated UI for managing your data."
    : "Failed to connect to Remult server.",
);

onMounted(() => {
  fetch("/api/admin") // Assuming there's a ping endpoint to check server status
    .then((response) => {
      if (response.ok) {
        status.value = "Success";
        canOpenAdmin.value = true;
      } else {
        status.value = "Error";
        canOpenAdmin.value = false;
      }
    })
    .catch(() => {
      status.value = "Error";
      canOpenAdmin.value = false;
    });
});
</script>
