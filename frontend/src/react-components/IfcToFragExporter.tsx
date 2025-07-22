import React, { useRef, useState } from "react";
import * as FRAGS from "@thatopen/fragments";

const IfcToFragExporter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setMessage("");
    try {
      // Leer archivo IFC como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const ifcBytes = new Uint8Array(arrayBuffer);

      // Crear el importador y cargar el IFC usando el método correcto del ejemplo oficial
      const serializer = new FRAGS.IfcImporter();
      
      // Usar exactamente la versión especificada en la documentación oficial
      serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.69/" };
      
      // Añadir callback de progreso según el ejemplo oficial
      const fragmentBytes = await serializer.process({ 
        bytes: ifcBytes,
        progressCallback: (progress, data) => {
          console.log(`Progreso: ${Math.round(progress * 100)}%`, data);
          setMessage(`Convirtiendo... ${Math.round(progress * 100)}%`);
        }
      });

      // Descargar el archivo .frag
      const fragFile = new File([fragmentBytes], file.name.replace(/\.ifc$/i, ".frag"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(fragFile);
      a.download = fragFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setMessage("¡Conversión completada!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error en la conversión: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 32 }}>
      <input
        type="file"
        accept=".ifc"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={processing}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
        style={{ minWidth: 260 }}
      >
        {processing ? "Procesando..." : "Seleccionar y convertir IFC a FRAG"}
      </button>
      {processing && (
        <div style={{ marginTop: 16 }}>
          <span role="status" aria-live="polite">Procesando archivo, por favor espera...</span>
        </div>
      )}
      {message && (
        <div style={{ marginTop: 16, color: message.startsWith("¡") ? "green" : "red" }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default IfcToFragExporter;