"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email invalido").or(z.literal("")),
  phone: z.string(),
  company: z.string(),
  source: z.string(),
  temperature: z.enum(["cold", "warm", "hot"]),
  notes: z.string(),
  // Campos Pergoland
  comuna: z.string(),
  medidas: z.string(),
  modelo: z.string(),
  tipo_cielo: z.string(),
  presupuesto_estimado: z.string(),
  fecha_visita: z.string(),
  direccion: z.string(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<ContactFormData> & { id?: string };
}

export function ContactForm({ open, onClose, initialData }: ContactFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      company: initialData?.company || "",
      source: initialData?.source || "otro",
      temperature: initialData?.temperature || "cold",
      notes: initialData?.notes || "",
      comuna: initialData?.comuna || "",
      medidas: initialData?.medidas || "",
      modelo: initialData?.modelo || "",
      tipo_cielo: initialData?.tipo_cielo || "",
      presupuesto_estimado: initialData?.presupuesto_estimado || "",
      fecha_visita: initialData?.fecha_visita || "",
      direccion: initialData?.direccion || "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const url = isEditing ? `/api/contacts/${initialData!.id}` : "/api/contacts";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...data,
        presupuesto_estimado: data.presupuesto_estimado
          ? parseInt(data.presupuesto_estimado.replace(/\./g, "").replace(/\$/g, ""))
          : null,
        fecha_visita: data.fecha_visita ? new Date(data.fecha_visita).toISOString() : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar");
      toast.success(isEditing ? "Contacto actualizado" : "Contacto creado");
      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al guardar el contacto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Contacto" : "Nuevo Contacto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ── DATOS PERSONALES ── */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
            Datos del contacto
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" {...register("name")} placeholder="Nombre completo" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" {...register("phone")} placeholder="+56 9 1234 5678" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="comuna">Comuna</Label>
              <Input id="comuna" {...register("comuna")} placeholder="Ej: Las Condes" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Direccion obra</Label>
              <Input id="direccion" {...register("direccion")} placeholder="Calle y numero" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fuente</Label>
              <Select value={watch("source")} onValueChange={(v) => v && setValue("source", v)}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="website">Sitio web</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="redes_sociales">Redes sociales</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="llamada_fria">Llamada fria</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="formulario">Formulario</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Temperatura</Label>
              <Select value={watch("temperature")} onValueChange={(v) => v && setValue("temperature", v as "cold" | "warm" | "hot")}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Frio</SelectItem>
                  <SelectItem value="warm">Tibio</SelectItem>
                  <SelectItem value="hot">Caliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── DATOS DEL PROYECTO ── */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t">
            Datos del proyecto
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="medidas">Medidas</Label>
              <Input id="medidas" {...register("medidas")} placeholder="Ej: 7x4m" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={watch("modelo")} onValueChange={(v) => v && setValue("modelo", v)}>
                <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Modelo A — Premium</SelectItem>
                  <SelectItem value="B">Modelo B — Semi abierto</SelectItem>
                  <SelectItem value="G">Modelo G — Abierto</SelectItem>
                  <SelectItem value="S">Modelo S — Sin cubierta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cielo</Label>
              <Select value={watch("tipo_cielo")} onValueChange={(v) => v && setValue("tipo_cielo", v)}>
                <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wpc_varillas">WPC Varillas</SelectItem>
                  <SelectItem value="madera_varillada">Madera Varillada</SelectItem>
                  <SelectItem value="machihembrado">Machihembrado</SelectItem>
                  <SelectItem value="pvc">PVC</SelectItem>
                  <SelectItem value="sin_cielo">Sin cielo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="presupuesto_estimado">Presupuesto estimado</Label>
              <Input id="presupuesto_estimado" {...register("presupuesto_estimado")} placeholder="Ej: 8500000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_visita">Fecha visita</Label>
            <Input id="fecha_visita" type="datetime-local" {...register("fecha_visita")} />
          </div>

          {/* ── NOTAS ── */}
          <div className="space-y-2 border-t pt-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Notas sobre el contacto o proyecto..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}