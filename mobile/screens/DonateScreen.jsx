/**
 * DonateScreen - Modern Premium Theme
 */

import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator,
  Modal, SafeAreaView, FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

const CHARITIES = [
  { id: 'one_tree_planted', name: 'One Tree Planted', icon: 'leaf' },
  { id: 'cool_earth', name: 'Cool Earth', icon: 'planet' },
  { id: 'rainforest_trust', name: 'Rainforest Trust', icon: 'paw' },
  { id: 'carbon_fund', name: 'Carbon Fund', icon: 'sync' },
];

const POINTS_PER_DOLLAR = 100;
const MIN_POINTS = 100;

function buildPaymentHtml({ clientSecret, publishableKey, amountCents, charityName }) {
  const dollars = (amountCents / 100).toFixed(2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>Donate</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;background:#FFFFFF}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;padding:24px 20px}
    .hdr{text-align:center;margin-bottom:32px}
    .hdr h1{font-size:24px;font-weight:900;color:#111827}
    .hdr p{color:#64748B;font-size:14px;margin-top:4px}
    .card{background:#F8FAFC;border:1px solid #F1F5F9;border-radius:24px;padding:24px;margin-bottom:32px}
    .amount{font-size:48px;font-weight:900;color:#10B981;text-align:center}
    .target{font-size:14px;font-weight:700;color:#64748B;text-align:center;margin-top:8px;text-transform:uppercase;letter-spacing:1px}
    #payment-form{margin-top:20px}
    .field-label{font-size:12px;font-weight:800;color:#64748B;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
    .input-row{background:white;border:1px solid #E2E8F0;border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.2s}
    .input-row.focused{border-color:#10B981;box-shadow:0 0 0 4px rgba(16,185,129,0.1)}
    #pay-btn{width:100%;background:#111827;color:white;border:none;border-radius:32px;padding:20px;font-size:18px;font-weight:800;cursor:pointer;margin-top:10px}
    #pay-btn:disabled{background:#E2E8F0;color:#94A3B8}
    #success-wrap{display:none;text-align:center;padding-top:40px}
    #success-wrap h2{font-size:28px;font-weight:900;margin-top:20px}
    #error-box{display:none;color:#EF4444;background:#FEF2F2;padding:12px;border-radius:12px;margin-bottom:16px;font-size:14px;font-weight:600}
  </style>
</head>
<body>
<div id="form-wrap">
  <div class="hdr"><h1>Secure Checkout</h1><p>Powered by Stripe</p></div>
  <div class="card"><div class="amount">$${dollars}</div><div class="target">Donation to ${charityName}</div></div>
  <div id="error-box"></div>
  <form id="payment-form">
    <div class="field-label">Card Details</div>
    <div class="input-row" id="card-wrap"><div id="card-el"></div></div>
    <button type="submit" id="pay-btn">PAY $${dollars} NOW</button>
  </form>
</div>
<div id="success-wrap"><h2>🎉 Thank You!</h2><p>Your contribution helps protect our planet.</p></div>
<script>
  var stripe = Stripe('${publishableKey}');
  var elements = stripe.elements();
  var card = elements.create('card', { style: { base: { fontSize: '16px', fontFamily: '-apple-system, sans-serif' }}});
  card.mount('#card-el');
  card.on('focus', function(){ document.getElementById('card-wrap').classList.add('focused') });
  card.on('blur', function(){ document.getElementById('card-wrap').classList.remove('focused') });
  document.getElementById('payment-form').addEventListener('submit', async function(e){
    e.preventDefault();
    document.getElementById('pay-btn').disabled = true;
    var res = await stripe.confirmCardPayment('${clientSecret}', { payment_method: { card: card }});
    if(res.error){
      document.getElementById('error-box').textContent = res.error.message;
      document.getElementById('error-box').style.display = 'block';
      document.getElementById('pay-btn').disabled = false;
    } else {
      document.getElementById('form-wrap').style.display = 'none';
      document.getElementById('success-wrap').style.display = 'block';
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'payment_success', paymentIntentId: res.paymentIntent.id }));
    }
  });
</script>
</body>
</html>`;
}

export default function DonateScreen({ navigation }) {
  const [balance, setBalance] = useState(0);
  const [pointsInput, setPointsInput] = useState('');
  const [selectedCharity, setSelected] = useState(CHARITIES[0].id);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('donate');

  const [modalVisible, setModalVisible] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [pendingIntent, setPendingIntent] = useState(null);
  const [confirmingPayment, setConfirming] = useState(false);

  const fetchData = async () => {
    setLoadingBalance(true);
    try {
      const [balRes, histRes] = await Promise.all([
        api.get('/points/balance'),
        api.get('/donations/history'),
      ]);
      const pts = balRes.data.points ?? 0;
      setBalance(pts);
      if (!pointsInput) setPointsInput(String(Math.min(pts, 500)));
      setHistory(histRes.data.history || []);
    } catch {
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const points = parseInt(pointsInput || '0', 10);
  const dollarAmount = (points / POINTS_PER_DOLLAR).toFixed(2);
  const isValid = points >= MIN_POINTS && points <= balance;

  const handleOpenPaymentForm = async () => {
    if (!isValid) return;
    setLoadingIntent(true);
    try {
      const { data } = await api.post('/donations/create-payment-intent', {
        pointsToConvert: points,
        charityId: selectedCharity,
      });
      const html = buildPaymentHtml({
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        amountCents: data.amount,
        charityName: data.charityName,
      });
      setPendingIntent({ id: data.paymentIntentId, points, charityId: selectedCharity });
      setPaymentHtml(html);
      setModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Payment initiation failed.');
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleWebViewMessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (msg.type === 'payment_success') {
      setConfirming(true);
      try {
        await api.post('/donations/confirm', {
          paymentIntentId: msg.paymentIntentId,
          pointsToConvert: pendingIntent.points,
          charityId: pendingIntent.charityId,
        });
        setTimeout(async () => {
          setModalVisible(false);
          setPointsInput('');
          await fetchData();
          Alert.alert('💚 Success', 'Thank you for your contribution!');
        }, 1500);
      } catch {
        setModalVisible(false);
      } finally {
        setConfirming(false);
      }
    }
  };

  if (loadingBalance) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.root}>
      {/* ── Custom Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.slate800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donate Impact</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        {['donate', 'history'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons name={t === 'donate' ? 'heart' : 'list'} size={20} color={tab === t ? COLORS.white : COLORS.slate400} />
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'donate' ? (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.balanceSummary}>
            <Ionicons name="leaf" size={24} color={COLORS.primary} />
            <Text style={styles.balanceValue}>{balance.toLocaleString()} Pts</Text>
            <Text style={styles.balanceSub}>Available for conversion</Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.fieldLabel}>POINTS TO CONVERT</Text>
            <TextInput
              style={styles.input}
              value={pointsInput}
              onChangeText={setPointsInput}
              keyboardType="numeric"
              placeholder="0"
            />
            <View style={styles.convRow}>
              <Text style={styles.convText}>USD Estimation:</Text>
              <Text style={styles.convValue}>${dollarAmount}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>CHOOSE RECIPIENT</Text>
          {CHARITIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.charityCard, selectedCharity === c.id && styles.charityCardActive]}
              onPress={() => setSelected(c.id)}
            >
              <View style={[styles.charityIconWrap, { backgroundColor: selectedCharity === c.id ? COLORS.primary : COLORS.slate50 }]}>
                <Ionicons name={c.icon} size={22} color={selectedCharity === c.id ? COLORS.white : COLORS.slate400} />
              </View>
              <Text style={[styles.charityName, selectedCharity === c.id && styles.charityNameActive]}>{c.name}</Text>
              {selectedCharity === c.id && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.payBtn, !isValid && styles.payBtnDisabled]}
            onPress={handleOpenPaymentForm}
            disabled={loadingIntent || !isValid}
          >
            {loadingIntent ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.white} />
                <Text style={styles.payBtnText}>SECURE DONATION</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 24 }}
          renderItem={({ item }) => (
            <View style={styles.histItem}>
              <View style={styles.histLeft}>
                <Text style={styles.histName}>{item.charityName || 'Global Support'}</Text>
                <Text style={styles.histDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.histRight}>
                <Text style={styles.histAmt}>${(item.amountCents / 100).toFixed(2)}</Text>
                <Text style={styles.histPts}>-{item.pointsUsed} pts</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={80} color={COLORS.slate100} />
              <Text style={styles.emptyTitle}>No past donations</Text>
              <Text style={styles.emptySub}>Your green contributions will appear here.</Text>
            </View>
          }
        />
      )}

      {/* ── Stripe Modal ────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Stripe Checkout</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} disabled={confirmingPayment}>
              <Ionicons name="close" size={28} color={COLORS.slate400} />
            </TouchableOpacity>
          </View>
          {paymentHtml ? (
            <WebView
              style={{ flex: 1 }}
              source={{ html: paymentHtml }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
            />
          ) : (
            <ActivityIndicator style={{ marginTop: 100 }} color={COLORS.primary} />
          )}
          {confirmingPayment && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.overlayText}>Finalizing Donation...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.slate50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.slate900 },

  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.slate50, marginHorizontal: 24, borderRadius: 24, padding: 6, marginBottom: 10 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 20 },
  tabBtnActive: { backgroundColor: COLORS.slate900, ...SHADOW },
  tabLabel: { fontSize: 13, fontWeight: '800', color: COLORS.slate400 },
  tabLabelActive: { color: COLORS.white },

  container: { flex: 1 },
  balanceSummary: { alignItems: 'center', marginVertical: 32 },
  balanceValue: { fontSize: 40, fontWeight: '900', color: COLORS.slate900, marginTop: 12 },
  balanceSub: { fontSize: 14, fontWeight: '600', color: COLORS.slate400, marginTop: 4 },

  inputCard: { backgroundColor: COLORS.primaryGhost, borderRadius: 32, padding: 24, marginBottom: 32 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: COLORS.slate400, letterSpacing: 1.5, marginBottom: 16 },
  input: { fontSize: 48, fontWeight: '900', color: COLORS.slate900, borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.05)', paddingVertical: 8, marginBottom: 16 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convText: { fontSize: 15, fontWeight: '600', color: COLORS.slate500 },
  convValue: { fontSize: 22, fontWeight: '900', color: COLORS.primaryDeep },

  charityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: COLORS.slate100, marginBottom: 12 },
  charityCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGhost },
  charityIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  charityName: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.slate600 },
  charityNameActive: { color: COLORS.slate900 },

  payBtn: { height: 72, backgroundColor: COLORS.slate900, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginTop: 32, ...SHADOW },
  payBtnDisabled: { backgroundColor: COLORS.slate300 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payBtnText: { color: COLORS.white, fontWeight: '900', letterSpacing: 1, fontSize: 16 },

  histItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.slate50 },
  histLeft: { flex: 1 },
  histName: { fontSize: 17, fontWeight: '700', color: COLORS.slate900, marginBottom: 4 },
  histDate: { fontSize: 13, fontWeight: '600', color: COLORS.slate400 },
  histRight: { alignItems: 'flex-end' },
  histAmt: { fontSize: 18, fontWeight: '900', color: COLORS.primaryDeep },
  histPts: { fontSize: 12, fontWeight: '700', color: COLORS.slate400, marginTop: 2 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.slate900, marginTop: 24 },
  emptySub: { fontSize: 15, color: COLORS.slate400, textAlign: 'center', marginTop: 8 },

  modalHeader: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  overlayText: { marginTop: 16, fontSize: 16, fontWeight: '700', color: COLORS.slate600 },
});
