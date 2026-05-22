"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContactForm } from "./ContactForm";
import { ActivityForm } from "@/components/activities/ActivityForm";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, FileText,
  Clock, Users, Pencil, Trash2, Plus, MessageCircle,
  Copy, Check, Send, Paperclip, Tag,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeDate, cleanPhoneForWhatsApp } from "@/lib/constants";
import { ACTIVITY_TYPE_CONFIG, SOURCE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { Temperature, ActivityType, LeadSource } from "@/types";
import { WhatsAppChat } from "./WhatsAppChat";

const activityIcons: Record<string, typeof Phone> = {
  call: Phone, email: Mail, meeting: Users, note: FileText, follow_up: Clock,
};

const ETIQUETAS_ESPECIALES = ["Proveedor", "Personal", "Referido"];
const ETIQUETA_COLORES: Record<string, string> = {
  Proveedor: "#0891b2", Personal: "#7c3aed", Referido: "#059669",
};

interface ContactDetailClientProps {
  contact: {
    id: string; name: string; email: string | null; phone: string | null;
    company: string | null; source: string; temperature: string; score: number;
    notes: string | null; createdAt: number | Date; comuna: string | null;
    medidas: string | null; modelo: string | null; tipo_cielo: string | null;
    presupuesto_estimado: number | null; fecha_visita: number | Date | null;
    direccion: string | null;
  };
  deals: Array<{
    id: string; title: string; value: number; probability: number;
    stageName: string | null; stageColor: string | null; createdAt: number | Date;
  }>;
  activities: Array<{
    id: string; type: string; description: string;
    scheduledAt: number | Date | null; completedAt: number | Date | null;
    attachmentPath: string | null; createdAt: number | Date;
  }>;
}

export function ContactDetailClient({ contact, deals, activities }: ContactDetailClientProps) {
  const router = useRouter();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"actividades" | "conversacion">("actividades");
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [etiquetaStages, setEtiquetaStages] = useState<Array<{ id: string; name: string }>>([]);
  const [assigningEtiqueta, setAssigningEtiqueta] = useState(false);

  // Etiqueta actual del contacto
  const etiquetaActual = deals[0]?.stageName && ETIQUETAS_ESPECIALES.includes(deals[0].stageName)
    ? deals[0].stageName : null;

  // Cargar etapas especiales al montar
  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((stages: Array<{ id: string; name: string }>) => {
        setEtiquetaStages(stages.filter((s) => ETIQUETAS_ESPECIALES.includes(s.name)));
      });
  }, []);

  const handleAsignarEtiqueta = async (stageName: string) => {
    const deal = deals[0];
    if (!deal) {
      toast.error("Este contacto no tiene un deal activo");
      return;
    }
    const stage = etiquetaStages.find((s) => s.name === stageName);
    if (!stage) return;

    setAssigningEtiqueta(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, stageId: stage.id }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success(`Etiqueta "${stageName}" asignada`);
      router.refresh();
    } catch {
      toast.error("Error al asignar etiqueta");
    } finally {
      setAssigningEtiqueta(false);
    }
  };

  const handleSendEmail = async (activityId: string) => {
    setSendingEmail(activityId);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id, activityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      toast.success(`Cotización enviada a ${data.to}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar email");
    } finally {
      setSendingEmail(null);
    }
  };

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success("Copiado");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Error al copiar");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Estas seguro de eliminar este contacto? Esta accion no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Contacto eliminado");
      router.push("/contacts");
    } catch {
      toast.error("Error al eliminar el contacto");
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success("Actividad completada ✅");
      router.refresh();
    } catch {
      toast.error("Error al completar la actividad");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")} className="cursor-pointer" aria-label="Volver a contactos">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            <StatusBadge temperature={contact.temperature as Temperature} />
            {etiquetaActual && (
              <span style={{ backgroundColor: ETIQUETA_COLORES[etiquetaActual] }}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white">
                {etiquetaActual}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Score: {contact.score}/100 · {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Selector de etiqueta */}
          <div className="flex items-center gap-1">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {etiquetaStages.map((stage) => (
              <button
                key={stage.id}
                disabled={assigningEtiqueta}
                onClick={() => handleAsignarEtiqueta(stage.name)}
                style={{
                  backgroundColor: etiquetaActual === stage.name ? ETIQUETA_COLORES[stage.name] : "transparent",
                  borderColor: ETIQUETA_COLORES[stage.name],
                  color: etiquetaActual === stage.name ? "white" : ETIQUETA_COLORES[stage.name],
                }}
                className="px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {stage.name}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)} className="cursor-pointer">
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="cursor-pointer text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informacion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</p>
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex-1 truncate">{contact.email}</a>
                <button onClick={() => handleCopy(contact.email!, "email")} className="p-1 rounded hover:bg-muted cursor-pointer">
                  {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{contact.phone}</span>
                <div className="flex items-center gap-1">
                  <a href={`https://wa.me/${cleanPhoneForWhatsApp(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-green-50 cursor-pointer" title="Abrir WhatsApp">
                    <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                  </a>
                  <a href={`tel:${contact.phone}`} className="p-1 rounded hover:bg-blue-50 cursor-pointer" title="Llamar">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                  </a>
                  <button onClick={() => handleCopy(contact.phone!, "phone")} className="p-1 rounded hover:bg-muted cursor-pointer">
                    {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            )}
            {contact.comuna && <div className="flex items-center gap-2 text-sm"><span>📍</span><span>{contact.comuna}</span></div>}
            {contact.direccion && <div className="flex items-center gap-2 text-sm"><span>🏠</span><span>{contact.direccion}</span></div>}
            {contact.company && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{contact.company}</span></div>}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Creado {formatDate(contact.createdAt)}</span>
            </div>
            {(contact.medidas || contact.modelo || contact.tipo_cielo || contact.presupuesto_estimado || contact.fecha_visita) && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proyecto</p>
                {contact.medidas && <div className="flex items-center gap-2 text-sm"><span>📐</span><span className="text-muted-foreground">Medidas:</span><span className="font-medium">{contact.medidas}</span></div>}
                {contact.modelo && <div className="flex items-center gap-2 text-sm"><span>🏗️</span><span className="text-muted-foreground">Modelo:</span><span className="font-medium">{contact.modelo}</span></div>}
                {contact.tipo_cielo && <div className="flex items-center gap-2 text-sm"><span>🪵</span><span className="text-muted-foreground">Cielo:</span><span className="font-medium">{contact.tipo_cielo.replace(/_/g, " ")}</span></div>}
                {contact.presupuesto_estimado && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>💰</span><span className="text-muted-foreground">Presupuesto:</span>
                    <span className="font-medium text-primary">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(contact.presupuesto_estimado)}</span>
                  </div>
                )}
                {contact.fecha_visita && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>📅</span><span className="text-muted-foreground">Visita:</span>
                    <span className="font-medium text-orange-600">{new Date(contact.fecha_visita).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
              </div>
            )}
            {contact.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
                <p className="text-sm text-muted-foreground">{contact.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deals */}
        <Card>
          <CardHeader><CardTitle className="text-base">Deals ({deals.length})</CardTitle></CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin deals</p>
            ) : (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <div key={deal.id} className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/deals/${deal.id}`)}>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</span>
                      <Badge variant="outline" style={{ borderColor: deal.stageColor || undefined, color: deal.stageColor || undefined }}>
                        {deal.stageName}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividades + WhatsApp */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <button onClick={() => setActiveTab("actividades")}
                  className={`px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${activeTab === "actividades" ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  Actividades ({activities.length})
                </button>
                {contact.phone && (
                  <button onClick={() => setActiveTab("conversacion")}
                    className={`px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${activeTab === "conversacion" ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    💬 WhatsApp
                  </button>
                )}
              </div>
              {activeTab === "actividades" && (
                <Button variant="ghost" size="sm" onClick={() => setShowActivityForm(true)} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-1" /> Registrar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {activeTab === "actividades" ? (
              activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividades. Registra una llamada, email o nota.</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || FileText;
                    const config = ACTIVITY_TYPE_CONFIG[activity.type as ActivityType];
                    const isPending = !activity.completedAt;
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <div className={`rounded-full p-2 h-fit shrink-0 ${activity.completedAt ? "bg-green-100" : "bg-muted"}`}>
                          <Icon className={`h-3.5 w-3.5 ${activity.completedAt ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{config?.label || activity.type}</Badge>
                            {activity.completedAt ? (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">✅ Completada</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-600 cursor-pointer hover:bg-orange-50"
                                onClick={() => handleCompleteActivity(activity.id)}>
                                Completar
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">{activity.description}</p>
                          {activity.scheduledAt && !activity.completedAt && (
                            <p className="text-xs text-orange-600 mt-0.5">
                              📅 {new Date(activity.scheduledAt).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          {activity.attachmentPath && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">{activity.attachmentPath.split("/").pop()}</span>
                              {contact.email && (
                                <button onClick={() => handleSendEmail(activity.id)} disabled={sendingEmail === activity.id}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 cursor-pointer">
                                  <Send className="h-3 w-3" />
                                  {sendingEmail === activity.id ? "Enviando..." : "Enviar por email"}
                                </button>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(activity.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              contact.phone && <WhatsAppChat phone={contact.phone} contactName={contact.name} />
            )}
          </CardContent>
        </Card>
      </div>

      <ContactForm open={showEditForm} onClose={() => { setShowEditForm(false); router.refresh(); }}
        initialData={{
          id: contact.id, name: contact.name, email: contact.email || "",
          phone: contact.phone || "", company: contact.company || "",
          source: contact.source, temperature: contact.temperature as "cold" | "warm" | "hot",
          notes: contact.notes || "", comuna: contact.comuna || "",
          medidas: contact.medidas || "", modelo: contact.modelo || "",
          tipo_cielo: contact.tipo_cielo || "",
          presupuesto_estimado: contact.presupuesto_estimado?.toString() || "",
          fecha_visita: contact.fecha_visita ? new Date(contact.fecha_visita).toISOString().slice(0, 16) : "",
          direccion: contact.direccion || "",
        }}
      />

      <ActivityForm open={showActivityForm} onClose={() => { setShowActivityForm(false); router.refresh(); }}
        preselectedContactId={contact.id} />
    </div>
  );
}
