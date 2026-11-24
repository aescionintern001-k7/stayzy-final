import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Colors, Shadows } from "../../theme/colors";
import { Header } from "../../components/Header";
import { WhatsAppFAB } from "../../components/WhatsAppFAB";
import { useRole } from "../../context/RoleContext";
import {
  KeyRound,
  Wifi,
  Calendar,
  CreditCard,
  Wrench,
  Shield,
  CheckCircle,
  Copy,
  Plus,
  X,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react-native";

export const CustomerStaysScreen: React.FC = () => {
  const { user } = useRole();
  const stay = user.activeStay;

  const [pinVisible, setPinVisible] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Extend Stay Modal
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendSuccess, setExtendSuccess] = useState(false);

  // Maintenance Ticket Modal
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState("Housekeeping");
  const [ticketNotes, setTicketNotes] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState("");

  // Rent Receipt Modal
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  const handleCopy = (text: string, label: string) => {
    setCopiedText(`${label} copied!`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleConfirmExtend = () => {
    setExtendModalVisible(false);
    setExtendSuccess(true);
  };

  const handleConfirmTicket = () => {
    const id = "TKT-" + Math.floor(1000 + Math.random() * 9000);
    setCreatedTicketId(id);
    setTicketModalVisible(false);
    setTicketSuccess(true);
    setTicketNotes("");
  };

  if (!stay) {
    return (
      <View style={styles.emptyContainer}>
        <KeyRound size={40} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Active Stay Yet</Text>
        <Text style={styles.emptySubtitle}>
          Reserve a PG accommodation from the Explore tab to activate your digital door PIN & Wi-Fi access.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.headerArea}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.pageTitle}>Resident Access Pass</Text>
          <View style={styles.activeTag}>
            <View style={styles.greenDot} />
            <Text style={styles.activeTagText}>CHECKED IN</Text>
          </View>
        </View>
        <Text style={styles.pageSubtitle}>
          Keyless smart door access, 300 Mbps Wi-Fi, and rent ledger
        </Text>
      </View>

      {/* Copy Toast feedback */}
      {copiedText && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={14} color="#ffffff" />
          <Text style={styles.toastText}>{copiedText}</Text>
        </View>
      )}

      {/* Main Stay Pass Card */}
      <View style={styles.passCard}>
        <View style={styles.passHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.passProperty}>{stay.propertyName}</Text>
            <Text style={styles.passRoom}>{stay.roomName}</Text>
          </View>
          <View style={styles.residentBadge}>
            <Sparkles size={12} color="#ffffff" />
            <Text style={styles.residentBadgeText}>RESIDENT</Text>
          </View>
        </View>

        {/* 1. Digital Smart Door Lock PIN Box */}
        <View style={styles.pinCard}>
          <View style={styles.pinIconRow}>
            <KeyRound size={18} color={Colors.forest} />
            <Text style={styles.pinLabel}>Keyless Smart Door Lock PIN</Text>
          </View>
          <View style={styles.pinDisplayRow}>
            <TouchableOpacity
              style={styles.pinBox}
              onPress={() => setPinVisible(!pinVisible)}
              activeOpacity={0.8}
            >
              <Text style={styles.pinCodeText}>
                {pinVisible ? stay.roomPin : "•••• #"}
              </Text>
              <Text style={styles.pinToggleText}>
                {pinVisible ? "Hide PIN" : "Tap to Reveal"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(stay.roomPin, "PIN")}
              activeOpacity={0.8}
            >
              <Copy size={16} color={Colors.forest} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Wi-Fi Credentials Box */}
        <View style={styles.credentialCard}>
          <View style={styles.credRow}>
            <Wifi size={16} color={Colors.forest} />
            <Text style={styles.credTitle}>High-Speed 300 Mbps Wi-Fi</Text>
          </View>
          <View style={styles.credValues}>
            <TouchableOpacity
              style={styles.credLineRow}
              onPress={() => handleCopy(stay.wifiName, "Wi-Fi SSID")}
              activeOpacity={0.7}
            >
              <Text style={styles.credLine}>
                SSID: <Text style={styles.credBold}>{stay.wifiName}</Text>
              </Text>
              <Copy size={13} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.credLineRow}
              onPress={() => handleCopy(stay.wifiPass, "Wi-Fi Password")}
              activeOpacity={0.7}
            >
              <Text style={styles.credLine}>
                Password: <Text style={styles.credBold}>{stay.wifiPass}</Text>
              </Text>
              <Copy size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Schedule & Rent Details */}
        <View style={styles.scheduleGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Stay Validity</Text>
            <Text style={styles.gridValue}>{stay.checkOutDate}</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Monthly Rent</Text>
            <Text style={styles.gridValue}>
              ₹{stay.rentAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Rent Status & Receipt Row */}
        <View style={styles.rentStatusRow}>
          <View style={styles.rentLeft}>
            <Text style={styles.rentStatusLabel}>Rent Status:</Text>
            <View
              style={[
                styles.rentStatusPill,
                stay.rentStatus === "PAID"
                  ? styles.rentStatusPaid
                  : styles.rentStatusDue,
              ]}
            >
              <Text
                style={[
                  styles.rentStatusPillText,
                  stay.rentStatus === "PAID"
                    ? styles.rentStatusPaidText
                    : styles.rentStatusDueText,
                ]}
              >
                ✓ {stay.rentStatus}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.receiptBtn}
            onPress={() => setReceiptModalVisible(true)}
            activeOpacity={0.8}
          >
            <FileText size={13} color={Colors.forest} />
            <Text style={styles.receiptBtnText}>View Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Hub */}
      <Text style={styles.hubTitle}>Resident Services</Text>

      <View style={styles.actionGrid}>
        {/* Extend Stay Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setExtendModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconCircle}>
            <Calendar size={18} color={Colors.forest} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Extend Stay</Text>
            <Text style={styles.actionCardSub}>
              Add months or transition to annual plan
            </Text>
          </View>
        </TouchableOpacity>

        {/* Maintenance Request Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setTicketModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconCircle}>
            <Wrench size={18} color={Colors.forest} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Raise Ticket</Text>
            <Text style={styles.actionCardSub}>
              Housekeeping, Wi-Fi, plumbing, electrical
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Safety & Gate Pass Note */}
      <View style={styles.safetyBox}>
        <Shield size={16} color={Colors.forest} />
        <Text style={styles.safetyText}>
          Your building features 24/7 CCTV surveillance, biometric visitor screening, and emergency power backup.
        </Text>
      </View>

      {/* Extend Stay Modal */}
      <Modal
        visible={extendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExtendModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Stay Extension</Text>
              <TouchableOpacity onPress={() => setExtendModalVisible(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Extend your tenure at {stay.propertyName}. Your existing keyless PIN and room assignment will remain unchanged.
            </Text>

            <Text style={styles.fieldLabel}>Select Extension Duration:</Text>
            <View style={styles.monthsRow}>
              {[1, 2, 3, 6].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.monthPill,
                    extendMonths === m && styles.monthPillSelected,
                  ]}
                  onPress={() => setExtendMonths(m)}
                >
                  <Text
                    style={[
                      styles.monthText,
                      extendMonths === m && styles.monthTextSelected,
                    ]}
                  >
                    +{m} {m === 1 ? "Month" : "Months"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.extendSummaryCard}>
              <Text style={styles.extendSummaryLabel}>New Check-out Date:</Text>
              <Text style={styles.extendSummaryValue}>
                31 Dec 2026 (Extended by {extendMonths} month)
              </Text>
              <Text style={styles.extendSummaryRent}>
                Rent rate locked at ₹{stay.rentAmount.toLocaleString("en-IN")}/mo
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleConfirmExtend}
            >
              <Text style={styles.modalSubmitText}>Submit Extension Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Extend Success Modal */}
      <Modal visible={extendSuccess} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <CheckCircle2 size={36} color={Colors.forest} />
            <Text style={styles.dialogTitle}>Extension Requested!</Text>
            <Text style={styles.dialogText}>
              Host Rajesh Sharma has been notified. We will update your checkout date upon confirmation.
            </Text>
            <TouchableOpacity
              style={styles.dialogDoneBtn}
              onPress={() => setExtendSuccess(false)}
            >
              <Text style={styles.dialogDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Maintenance Ticket Modal */}
      <Modal
        visible={ticketModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Maintenance Ticket</Text>
              <TouchableOpacity onPress={() => setTicketModalVisible(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Select Issue Category:</Text>
            <View style={styles.catGrid}>
              {[
                "Housekeeping",
                "Wi-Fi / Fiber",
                "Plumbing",
                "Air Conditioning",
                "Electrical",
              ].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.catPill,
                    ticketCategory === c && styles.catPillSelected,
                  ]}
                  onPress={() => setTicketCategory(c)}
                >
                  <Text
                    style={[
                      styles.catText,
                      ticketCategory === c && styles.catTextSelected,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Describe Issue (Optional):</Text>
            <TextInput
              placeholder="e.g. Washroom tap drippage, need room cleaning..."
              placeholderTextColor={Colors.textMuted}
              value={ticketNotes}
              onChangeText={setTicketNotes}
              style={styles.ticketInput}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleConfirmTicket}
            >
              <Text style={styles.modalSubmitText}>Submit Ticket</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ticket Success Modal */}
      <Modal visible={ticketSuccess} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <CheckCircle2 size={36} color={Colors.forest} />
            <Text style={styles.dialogTitle}>Ticket #{createdTicketId} Logged</Text>
            <Text style={styles.dialogText}>
              Your maintenance request for {ticketCategory} has been dispatched to property staff. Expected resolution within 4 hours.
            </Text>
            <TouchableOpacity
              style={styles.dialogDoneBtn}
              onPress={() => setTicketSuccess(false)}
            >
              <Text style={styles.dialogDoneText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rent Receipt Modal */}
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rent Receipt — Oct 2026</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.receiptBox}>
              <Text style={styles.receiptLine}>
                Receipt No: <Text style={styles.receiptBold}>REC-2026-8921</Text>
              </Text>
              <Text style={styles.receiptLine}>
                Resident: <Text style={styles.receiptBold}>{user.name}</Text>
              </Text>
              <Text style={styles.receiptLine}>
                Property: <Text style={styles.receiptBold}>{stay.propertyName}</Text>
              </Text>
              <Text style={styles.receiptLine}>
                Room: <Text style={styles.receiptBold}>{stay.roomName}</Text>
              </Text>
              <Text style={styles.receiptLine}>
                Amount Paid: <Text style={styles.receiptBold}>₹{stay.rentAmount.toLocaleString("en-IN")}</Text>
              </Text>
              <Text style={styles.receiptLine}>
                Payment Mode: <Text style={styles.receiptBold}>UPI / Auto-Debit</Text>
              </Text>
              <Text style={styles.receiptLine}>
                Status: <Text style={[styles.receiptBold, { color: Colors.forest }]}>PAID & VERIFIED</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dialogDoneBtn}
              onPress={() => setReceiptModalVisible(false)}
            >
              <Text style={styles.dialogDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
      <WhatsAppFAB />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  headerArea: {
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textMain,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.forest,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.forest,
  },
  toastBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.forest,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    marginBottom: 10,
    alignSelf: "center",
  },
  toastText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  passCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Shadows.card,
  },
  passHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  passProperty: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textMain,
  },
  passRoom: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  residentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.forest,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 3,
  },
  residentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
  pinCard: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pinIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.forest,
  },
  pinDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pinCodeText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.forest,
    letterSpacing: 2,
  },
  pinToggleText: {
    fontSize: 11,
    color: Colors.forest,
    fontWeight: "700",
  },
  copyBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  credentialCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  credRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  credTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textMain,
  },
  credValues: {
    gap: 4,
  },
  credLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  credLine: {
    fontSize: 11,
    color: Colors.textSub,
  },
  credBold: {
    fontWeight: "800",
    color: Colors.textMain,
  },
  scheduleGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    marginBottom: 10,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  gridValue: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMain,
    marginTop: 2,
  },
  rentStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  rentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rentStatusLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  rentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  rentStatusPaid: {
    backgroundColor: Colors.primaryLight,
  },
  rentStatusDue: {
    backgroundColor: "#FEE2E2",
  },
  rentStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  rentStatusPaidText: {
    color: Colors.forest,
  },
  rentStatusDueText: {
    color: Colors.accentRed,
  },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.forest,
    textDecorationLine: "underline",
  },
  hubTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
    marginBottom: 8,
  },
  actionGrid: {
    gap: 8,
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMain,
  },
  actionCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  safetyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  safetyText: {
    fontSize: 11,
    color: Colors.forest,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
  },
  modalDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textMain,
    marginBottom: 6,
  },
  monthsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  monthPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  monthPillSelected: {
    backgroundColor: Colors.forest,
    borderColor: Colors.forest,
  },
  monthText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  monthTextSelected: {
    color: "#ffffff",
  },
  extendSummaryCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  extendSummaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  extendSummaryValue: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMain,
    marginTop: 2,
  },
  extendSummaryRent: {
    fontSize: 11,
    color: Colors.forest,
    fontWeight: "700",
    marginTop: 2,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.forest,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  catPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  catPillSelected: {
    backgroundColor: Colors.forest,
    borderColor: Colors.forest,
  },
  catText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  catTextSelected: {
    color: "#ffffff",
  },
  ticketInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    color: Colors.textMain,
    textAlignVertical: "top",
    backgroundColor: Colors.background,
    marginBottom: 16,
  },
  dialogCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: "center",
    alignSelf: "center",
    maxWidth: 360,
    width: "100%",
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textMain,
    marginTop: 10,
    marginBottom: 6,
  },
  dialogText: {
    fontSize: 12,
    color: Colors.textSub,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  dialogDoneBtn: {
    backgroundColor: Colors.forest,
    paddingVertical: 10,
    borderRadius: 6,
    width: "100%",
    alignItems: "center",
  },
  dialogDoneText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  receiptBox: {
    width: "100%",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 6,
    gap: 4,
    marginBottom: 16,
  },
  receiptLine: {
    fontSize: 12,
    color: Colors.textSub,
  },
  receiptBold: {
    fontWeight: "800",
    color: Colors.textMain,
  },
});
