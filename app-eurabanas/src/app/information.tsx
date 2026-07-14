import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/lib/theme";

const refund = [
  ["Cancelación flexible", "Cuando la tarifa sea flexible, podrás cancelar sin penalidad hasta 7 días antes del check-in, sujeto a los cargos no recuperables informados."],
  ["Cancelación tardía", "Dentro de los 7 días previos podrá retenerse la primera noche o el porcentaje indicado en la tarifa seleccionada."],
  ["No presentación", "Si el huésped no se presenta y no informa, la reserva podrá considerarse no show conforme a la confirmación recibida."],
  ["Tarifas no reembolsables", "Las promociones no reembolsables deben identificarse claramente antes del pago."],
  ["Reembolsos aprobados", "Se procesan por el mismo medio de pago cuando sea posible. El plazo final depende del banco o procesador."],
];

const faq = [
  ["¿La reserva queda registrada?", "Sí. La app usa el mismo sistema de disponibilidad y reservas de la web y entrega un folio."],
  ["¿Dónde veo el pago?", "Mercado Pago se abre en el navegador seguro del sistema. El webhook actualiza el estado de la reserva."],
  ["¿Cómo acumulo puntos?", "Las reservas asociadas a tu correo se reflejan en Club Estadías Urbanas según las reglas vigentes."],
  ["¿Puedo pedir ayuda?", "Puedes contactar al equipo por email o WhatsApp desde esta pantalla."],
];

function Section({ title, items }: { title: string; items: string[][] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(([heading, copy]) => (
        <View key={heading} style={styles.card}>
          <Text style={styles.cardTitle}>{heading}</Text>
          <Text style={styles.cardText}>{copy}</Text>
        </View>
      ))}
    </View>
  );
}

export default function InformationScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Ionicons name="business-outline" size={42} color={colors.sky} />
        <Text style={styles.title}>Quiénes somos</Text>
        <Text style={styles.heroText}>Estadías Urbanas conecta huéspedes con alojamientos equipados para viajes de trabajo, turismo, relocalización y estadías flexibles, con atención humana y condiciones claras.</Text>
      </View>
      <Section title="Preguntas frecuentes" items={faq} />
      <Section title="Resumen de la política de reembolso" items={refund} />
      <Text style={styles.note}>Las condiciones específicas de la tarifa informadas antes del pago forman parte de la confirmación de cada reserva.</Text>
      <View style={styles.actions}>
        <AppButton label="Ver política completa" variant="secondary" icon="document-text-outline" onPress={() => void Linking.openURL("https://www.estadiasurbanas.com/politica-reembolso.html")} />
        <AppButton label="Escribir por email" variant="ghost" icon="mail-outline" onPress={() => void Linking.openURL("mailto:reservas@estadiasurbanas.com")} />
        <AppButton label="Contactar por WhatsApp" variant="ghost" icon="logo-whatsapp" onPress={() => void Linking.openURL("https://wa.me/56973787720?text=Hola%20Estadias%20Urbanas%2C%20necesito%20ayuda")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navyDark, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  title: { color: colors.surface, fontSize: 29, fontWeight: "900" },
  heroText: { color: "#C5D8EA", lineHeight: 22 },
  section: { gap: spacing.sm, marginTop: spacing.xl },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  cardTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  cardText: { color: colors.textMuted, lineHeight: 21, marginTop: 5 },
  note: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
