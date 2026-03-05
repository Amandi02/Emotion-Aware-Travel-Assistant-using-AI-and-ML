/**
 * DonateScreen
 *
 * Full in-app Stripe payment flow:
 *  1. User picks charity + enters points
 *  2. App calls backend to create a Stripe PaymentIntent (clientSecret)
 *  3. A bottom-sheet modal renders a Stripe Payment Element form inside a WebView
 *     (Stripe.js loads from CDN, card details never touch our servers)
 *  4. On success, app calls /api/donations/confirm to deduct points instantly
 *  5. History tab shows all past donations
 */

import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator,
  Modal, SafeAreaView, Platform, FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHARITIES = [
  { id: 'one_tree_planted', name: 'One Tree Planted 🌳' },
  { id: 'cool_earth',       name: 'Cool Earth 🌿' },
  { id: 'rainforest_trust', name: 'Rainforest Trust 🐾' },
  { id: 'carbon_fund',      name: 'Carbon Fund ♻️' },
];

const POINTS_PER_DOLLAR = 100;
const MIN_POINTS        = 100;

// ─── Stripe Payment Form HTML ─────────────────────────────────────────────────
// Rendered inside a WebView using the classic Stripe Card Element.
// Uses confirmCardPayment() — NEVER redirects, stays fully in-app.

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
    html,body{height:100%;background:#0f0f12}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      color:#f0f0f2;padding:24px 18px 40px}

    /* ── Header ───────────────────────────────────────────────────── */
    .hdr{text-align:center;margin-bottom:22px}
    .hdr-emoji{font-size:38px}
    .hdr h1{font-size:20px;font-weight:700;margin-top:6px}
    .hdr p{color:#8a8a94;font-size:12px;margin-top:3px}

    /* ── Amount card ──────────────────────────────────────────────── */
    .amount-card{background:#0f2a26;border:1px solid #2dd4bf44;
      border-radius:14px;padding:16px;text-align:center;margin-bottom:24px}
    .amount-val{color:#2dd4bf;font-size:36px;font-weight:800;line-height:1}
    .amount-sub{color:#8a8a94;font-size:12px;margin-top:4px}
    .charity-pill{display:inline-block;background:#1a1a2f;border:1px solid #6366f133;
      border-radius:20px;padding:4px 14px;font-size:12px;color:#a5b4fc;margin-top:10px}

    /* ── Card fields ──────────────────────────────────────────────── */
    .field-label{color:#a0a0aa;font-size:11px;font-weight:600;letter-spacing:.6px;
      text-transform:uppercase;margin-bottom:7px}
    .card-row{background:#1a1a1f;border:1px solid #2a2a32;border-radius:10px;
      padding:14px;margin-bottom:14px;transition:border-color .2s}
    .card-row.focused{border-color:#2dd4bf}
    /* Stripe mounts its iframe into #card-number-el etc. */
    .card-number-wrap{margin-bottom:14px}
    .card-expiry-cvv{display:flex;gap:12px}
    .card-expiry-cvv .card-row{flex:1;margin-bottom:0}

    /* ── Error ────────────────────────────────────────────────────── */
    #error-box{display:none;background:#2a1a1a;border:1px solid #f8717155;
      border-radius:8px;padding:12px 14px;color:#f87171;font-size:13px;
      margin-bottom:14px;line-height:1.5}

    /* ── Pay button ───────────────────────────────────────────────── */
    #pay-btn{width:100%;background:#2dd4bf;color:#0f0f12;border:none;
      border-radius:12px;padding:16px;font-size:16px;font-weight:700;
      cursor:pointer;margin-top:4px;
      display:flex;align-items:center;justify-content:center;gap:8px;
      transition:background .2s}
    #pay-btn:disabled{background:#2a2a32;color:#555;cursor:not-allowed}
    .spinner{width:18px;height:18px;border:2.5px solid #0f0f12;
      border-top-color:transparent;border-radius:50%;
      animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    /* ── Test-card hint ───────────────────────────────────────────── */
    .hint{color:#555;font-size:11px;text-align:center;margin-top:14px;line-height:1.7}
    .hint b{color:#8a8a94}

    /* ── Success state ────────────────────────────────────────────── */
    #success-wrap{display:none;text-align:center;padding-top:48px}
    #success-wrap .s-emoji{font-size:60px}
    #success-wrap h2{font-size:22px;font-weight:700;margin-top:14px}
    #success-wrap p{color:#8a8a94;font-size:14px;margin-top:8px;line-height:1.6}
    .s-badge{display:inline-block;background:#0f2a26;border:1px solid #2dd4bf44;
      border-radius:12px;padding:10px 22px;margin-top:16px;color:#2dd4bf;
      font-weight:700;font-size:14px}
  </style>
</head>
<body>

<!-- ── Payment Form ─────────────────────────────────────────────────────────── -->
<div id="form-wrap">

  <div class="hdr">
    <div class="hdr-emoji">💳</div>
    <h1>Secure Payment</h1>
    <p>Your card details are encrypted by Stripe</p>
  </div>

  <div class="amount-card">
    <div class="amount-val">$${dollars}</div>
    <div class="amount-sub">USD · one-time donation</div>
    <div class="charity-pill">${charityName}</div>
  </div>

  <div id="error-box"></div>

  <form id="payment-form">

    <!-- Card number -->
    <div class="field-label">Card Number</div>
    <div class="card-row card-number-wrap" id="card-number-wrap">
      <div id="card-number-el"></div>
    </div>

    <!-- Expiry + CVV side by side -->
    <div class="card-expiry-cvv">
      <div style="flex:1">
        <div class="field-label">Expiry</div>
        <div class="card-row" id="card-expiry-wrap">
          <div id="card-expiry-el"></div>
        </div>
      </div>
      <div style="flex:1">
        <div class="field-label">CVV</div>
        <div class="card-row" id="card-cvc-wrap">
          <div id="card-cvc-el"></div>
        </div>
      </div>
    </div>

    <button type="submit" id="pay-btn" style="margin-top:20px">
      <span id="btn-label">Pay $${dollars}</span>
    </button>

  </form>

  <p class="hint">
    Test: <b>4242 4242 4242 4242</b> &nbsp;·&nbsp; any future date &nbsp;·&nbsp; any CVV
  </p>
</div>

<!-- ── Success Screen ──────────────────────────────────────────────────────── -->
<div id="success-wrap">
  <div class="s-emoji">🎉</div>
  <h2>Donation Complete!</h2>
  <p>Your payment was successful.<br>Your eco-points will be updated.</p>
  <div class="s-badge">💚 Thank you for the planet!</div>
</div>

<script>
(function(){
  /* ── Init Stripe with individual card elements (no redirect, no Link) ─── */
  var stripe   = Stripe('${publishableKey}');
  var elements = stripe.elements({
    fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap' }],
  });

  var cardStyle = {
    base: {
      color:           '#f0f0f2',
      fontFamily:      '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      fontSize:        '16px',
      fontSmoothing:   'antialiased',
      '::placeholder': { color: '#555' },
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  };

  var cardNumberEl = elements.create('cardNumber', { style: cardStyle, showIcon: true });
  var cardExpiryEl = elements.create('cardExpiry', { style: cardStyle });
  var cardCvcEl    = elements.create('cardCvc',    { style: cardStyle });

  cardNumberEl.mount('#card-number-el');
  cardExpiryEl.mount('#card-expiry-el');
  cardCvcEl.mount('#card-cvc-el');

  /* Focus styling */
  [
    { el: cardNumberEl, wrap: 'card-number-wrap' },
    { el: cardExpiryEl, wrap: 'card-expiry-wrap' },
    { el: cardCvcEl,    wrap: 'card-cvc-wrap'    },
  ].forEach(function(item) {
    item.el.on('focus', function() {
      document.getElementById(item.wrap).classList.add('focused');
    });
    item.el.on('blur', function() {
      document.getElementById(item.wrap).classList.remove('focused');
    });
  });

  /* ── Form submit ─────────────────────────────────────────────────────── */
  var form    = document.getElementById('payment-form');
  var btn     = document.getElementById('pay-btn');
  var errorEl = document.getElementById('error-box');

  function setLoading(on) {
    btn.disabled = on;
    document.getElementById('btn-label').innerHTML = on
      ? '<div class="spinner"></div>'
      : 'Pay \$${dollars}';
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    setLoading(true);
    errorEl.style.display = 'none';

    /* confirmCardPayment — card only, zero redirects */
    var result = await stripe.confirmCardPayment('${clientSecret}', {
      payment_method: { card: cardNumberEl },
    });

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.style.display = 'block';
      setLoading(false);
    } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
      document.getElementById('form-wrap').style.display    = 'none';
      document.getElementById('success-wrap').style.display = 'block';
      /* Notify React Native app */
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:            'payment_success',
          paymentIntentId: result.paymentIntent.id,
        }));
      }
    } else {
      setLoading(false);
      errorEl.textContent = 'Unexpected state — please try again.';
      errorEl.style.display = 'block';
    }
  });
})();
</script>
</body>
</html>`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DonateScreen({ navigation }) {
  const [balance, setBalance]               = useState(0);
  const [pointsInput, setPointsInput]       = useState('');
  const [selectedCharity, setSelected]     = useState(CHARITIES[0].id);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingIntent, setLoadingIntent]   = useState(false);
  const [history, setHistory]               = useState([]);
  const [tab, setTab]                       = useState('donate');

  // Payment modal state
  const [modalVisible, setModalVisible]     = useState(false);
  const [paymentHtml, setPaymentHtml]       = useState('');
  const [pendingIntent, setPendingIntent]   = useState(null); // { id, points, charityId }
  const [confirmingPayment, setConfirming]  = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────

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

  // ── Derived values ──────────────────────────────────────────────────────────

  const points      = parseInt(pointsInput || '0', 10);
  const dollarAmount = (points / POINTS_PER_DOLLAR).toFixed(2);
  const isValid     = points >= MIN_POINTS && points <= balance;

  // ── Open in-app payment form ────────────────────────────────────────────────

  const handleOpenPaymentForm = async () => {
    if (!isValid) {
      if (balance < MIN_POINTS) {
        Alert.alert(
          'Not enough points',
          `You need at least ${MIN_POINTS} eco-points to donate.\n\nVisit low-emission places to earn points!`,
          [
            { text: '😊 Scan Emotion', onPress: () => navigation.navigate('EmotionScan') },
            { text: 'OK' },
          ]
        );
      }
      return;
    }

    setLoadingIntent(true);
    try {
      const { data } = await api.post('/donations/create-payment-intent', {
        pointsToConvert: points,
        charityId:       selectedCharity,
      });

      const html = buildPaymentHtml({
        clientSecret:   data.clientSecret,
        publishableKey: data.publishableKey,
        amountCents:    data.amount,
        charityName:    data.charityName,
      });

      setPendingIntent({
        id:       data.paymentIntentId,
        points,
        charityId: selectedCharity,
      });
      setPaymentHtml(html);
      setModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Could not create payment session.');
    } finally {
      setLoadingIntent(false);
    }
  };

  // ── Handle message from WebView (Stripe success) ────────────────────────────

  const handleWebViewMessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (msg.type === 'payment_success') {
      setConfirming(true);
      try {
        const { data } = await api.post('/donations/confirm', {
          paymentIntentId: msg.paymentIntentId,
          pointsToConvert: pendingIntent.points,
          charityId:       pendingIntent.charityId,
        });

        // Let the in-app success animation show for 1.5s then close
        setTimeout(async () => {
          setModalVisible(false);
          setPaymentHtml('');
          setPendingIntent(null);
          setPointsInput('');
          await fetchData();
          Alert.alert(
            '💚 Donation Complete!',
            data.message || 'Thank you for making the planet greener!',
            [{ text: 'OK' }]
          );
        }, 1500);
      } catch (err) {
        setModalVisible(false);
        Alert.alert(
          'Payment recorded',
          'Your payment went through! Points will be updated shortly.',
          [{ text: 'OK', onPress: () => fetchData() }]
        );
      } finally {
        setConfirming(false);
      }
    }
  };

  // ── Loading screen ──────────────────────────────────────────────────────────

  if (loadingBalance) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'donate' && styles.tabActive]}
          onPress={() => setTab('donate')}
        >
          <Text style={[styles.tabText, tab === 'donate' && styles.tabTextActive]}>Donate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            History {history.length > 0 ? `(${history.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'donate' ? (
        /* ── DONATE TAB ────────────────────────────────────────────────────── */
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
          <Text style={styles.title}>Donate to Charity</Text>
          <Text style={styles.subtitle}>
            Convert eco-points → USD → real donation, all inside the app
          </Text>

          {/* Balance card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balLabel}>Your Eco-Points</Text>
            <Text style={styles.balValue}>{balance.toLocaleString()}</Text>
            <Text style={styles.balSub}>= ${(balance / POINTS_PER_DOLLAR).toFixed(2)} USD available</Text>
            {balance < MIN_POINTS && (
              <Text style={styles.balWarning}>
                ⚠️ Earn {MIN_POINTS - balance} more pts to unlock donations
              </Text>
            )}
          </View>

          {/* Points input */}
          <Text style={styles.fieldLabel}>Points to donate  (min {MIN_POINTS})</Text>
          <TextInput
            style={[styles.input, !isValid && points > 0 && styles.inputError]}
            value={pointsInput}
            onChangeText={setPointsInput}
            keyboardType="numeric"
            placeholder={`e.g. 100  (= $1.00)`}
            placeholderTextColor="#444"
          />
          {points > balance && balance > 0 && (
            <Text style={styles.validationMsg}>⚠️ You only have {balance} points</Text>
          )}
          {points > 0 && points < MIN_POINTS && (
            <Text style={styles.validationMsg}>⚠️ Minimum is {MIN_POINTS} points</Text>
          )}

          {/* Conversion preview */}
          {isValid && (
            <View style={styles.conversionRow}>
              <Text style={styles.conversionText}>
                {points} pts  →  <Text style={styles.conversionHighlight}>${dollarAmount} USD</Text>
              </Text>
              <Text style={styles.conversionRate}>100 pts = $1.00</Text>
            </View>
          )}

          {/* Charity selector */}
          <Text style={styles.fieldLabel}>Choose a charity</Text>
          {CHARITIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.charityOption, selectedCharity === c.id && styles.charitySelected]}
              onPress={() => setSelected(c.id)}
            >
              <Text style={[styles.charityText, selectedCharity === c.id && styles.charityTextSelected]}>
                {c.name}
              </Text>
              {selectedCharity === c.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}

          {/* Pay button */}
          <TouchableOpacity
            style={[styles.donateBtn, (!isValid || loadingIntent) && styles.donateBtnDisabled]}
            onPress={handleOpenPaymentForm}
            disabled={loadingIntent}
          >
            {loadingIntent ? (
              <ActivityIndicator color="#0f0f12" />
            ) : (
              <Text style={styles.donateBtnText}>
                {isValid
                  ? `💳  Pay $${dollarAmount} via Stripe`
                  : balance < MIN_POINTS
                    ? `Need ${MIN_POINTS - balance} more points`
                    : 'Enter a valid amount'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Earn-points shortcut */}
          {balance < MIN_POINTS && (
            <TouchableOpacity
              style={styles.earnBtn}
              onPress={() => navigation.navigate('EmotionScan')}
            >
              <Text style={styles.earnBtnText}>😊  Scan Emotion → Find Eco Places → Earn Points</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            Card details are handled directly by Stripe.{'\n'}
            We never store your card information.{'\n'}
            Points are deducted only after successful payment.
          </Text>
        </ScrollView>
      ) : (
        /* ── HISTORY TAB ───────────────────────────────────────────────────── */
        <FlatList
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 48 }}
          data={history}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={
            <Text style={[styles.title, { marginBottom: 16 }]}>Donation History</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.histItem}>
              <View style={styles.histLeft}>
                <Text style={styles.histCharity}>{item.charityName || item.charityId}</Text>
                <Text style={styles.histDate}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </Text>
                <View style={[
                  styles.histStatusBox,
                  { backgroundColor: item.status === 'completed' ? '#0f2a1a' : '#2a1a0f' },
                ]}>
                  <Text style={[
                    styles.histStatusText,
                    { color: item.status === 'completed' ? '#4ade80' : '#fb923c' },
                  ]}>
                    {item.status === 'completed' ? '✅ Completed' : `⏳ ${item.status}`}
                  </Text>
                </View>
              </View>
              <View style={styles.histRight}>
                <Text style={styles.histDollar}>
                  ${(item.amountCents / 100).toFixed(2)}
                </Text>
                <Text style={styles.histPoints}>−{item.pointsUsed} pts</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💚</Text>
              <Text style={styles.emptyTitle}>No donations yet</Text>
              <Text style={styles.emptySubText}>
                Earn eco-points by visiting low-emission places, then make your first donation!
              </Text>
            </View>
          }
        />
      )}

      {/* ── Stripe Payment Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!confirmingPayment) {
            setModalVisible(false);
            setPaymentHtml('');
            setPendingIntent(null);
          }
        }}
      >
        <SafeAreaView style={styles.modalRoot}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Secure Payment</Text>
            <TouchableOpacity
              onPress={() => {
                if (!confirmingPayment) {
                  setModalVisible(false);
                  setPaymentHtml('');
                  setPendingIntent(null);
                }
              }}
              disabled={confirmingPayment}
            >
              <Text style={[styles.modalClose, confirmingPayment && { opacity: 0.3 }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stripe badge */}
          <View style={styles.stripeBadge}>
            <Text style={styles.stripeBadgeText}>🔒  Powered by Stripe  ·  PCI compliant</Text>
          </View>

          {/* WebView with Stripe Payment Element */}
          {paymentHtml ? (
            <WebView
              style={styles.webview}
              source={{ html: paymentHtml }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              // Allow Stripe.js to load from CDN
              mixedContentMode="always"
              // Prevent zooming
              scalesPageToFit={false}
              // Important: allow keyboard to push up the webview
              keyboardDisplayRequiresUserAction={false}
              automaticallyAdjustContentInsets={false}
              contentInset={{ top: 0, right: 0, bottom: 0, left: 0 }}
            />
          ) : (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2dd4bf" />
            </View>
          )}

          {/* Confirming overlay */}
          {confirmingPayment && (
            <View style={styles.confirmOverlay}>
              <ActivityIndicator size="large" color="#2dd4bf" />
              <Text style={styles.confirmText}>Confirming your donation…</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0f0f12' },
  container: { flex: 1, padding: 20 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f12' },

  // Tabs
  tabBar:        { flexDirection: 'row', backgroundColor: '#1a1a1f', borderBottomWidth: 1, borderBottomColor: '#2a2a32' },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#2dd4bf' },
  tabText:       { color: '#8a8a94', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#2dd4bf' },

  // Header
  title:    { fontSize: 22, fontWeight: '700', color: '#f0f0f2', marginBottom: 4, marginTop: 4 },
  subtitle: { fontSize: 13, color: '#8a8a94', marginBottom: 20, lineHeight: 18 },

  // Balance card
  balanceCard: {
    backgroundColor: '#0f2a26', borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#2dd4bf33', marginBottom: 24,
  },
  balLabel:   { color: '#8a8a94', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  balValue:   { color: '#2dd4bf', fontSize: 40, fontWeight: '800', marginTop: 4 },
  balSub:     { color: '#8a8a94', fontSize: 13, marginTop: 4 },
  balWarning: { color: '#facc15', fontSize: 12, marginTop: 10, textAlign: 'center', lineHeight: 18 },

  // Form
  fieldLabel:    { color: '#a0a0aa', fontSize: 12, marginBottom: 8, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1a1a1f', borderWidth: 1, borderColor: '#2a2a32',
    borderRadius: 10, padding: 14, color: '#f0f0f2', fontSize: 18, marginBottom: 6,
  },
  inputError:    { borderColor: '#f87171' },
  validationMsg: { color: '#f87171', fontSize: 13, marginBottom: 10 },

  conversionRow: {
    backgroundColor: '#0f2a26', borderRadius: 10, padding: 14,
    marginBottom: 22, alignItems: 'center', borderWidth: 1, borderColor: '#2dd4bf22',
  },
  conversionText:      { color: '#8a8a94', fontSize: 17 },
  conversionHighlight: { color: '#2dd4bf', fontWeight: '800', fontSize: 21 },
  conversionRate:      { color: '#555', fontSize: 11, marginTop: 4 },

  // Charities
  charityOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1f', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#2a2a32', marginBottom: 8,
  },
  charitySelected:     { borderColor: '#2dd4bf', backgroundColor: '#0f2a26' },
  charityText:         { color: '#8a8a94', fontSize: 15 },
  charityTextSelected: { color: '#f0f0f2', fontWeight: '600' },
  checkmark:           { color: '#2dd4bf', fontSize: 18, fontWeight: '700' },

  // Buttons
  donateBtn: {
    backgroundColor: '#2dd4bf', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 16,
  },
  donateBtnDisabled: { backgroundColor: '#2a2a32' },
  donateBtnText:     { color: '#0f0f12', fontSize: 16, fontWeight: '700' },
  earnBtn: {
    backgroundColor: '#1a1a2f', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#6366f133', marginTop: 10,
  },
  earnBtnText: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
  disclaimer:  { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 18 },

  // History
  histItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: '#1a1a1f', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a32',
  },
  histLeft:       { flex: 1 },
  histCharity:    { color: '#f0f0f2', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  histDate:       { color: '#8a8a94', fontSize: 12, marginBottom: 6 },
  histStatusBox:  { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  histStatusText: { fontSize: 12, fontWeight: '600' },
  histRight:      { alignItems: 'flex-end' },
  histDollar:     { color: '#2dd4bf', fontSize: 20, fontWeight: '800' },
  histPoints:     { color: '#f87171', fontSize: 12, marginTop: 2 },

  // Empty history
  emptyBox:    { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { color: '#f0f0f2', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubText: { color: '#8a8a94', fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  // Payment Modal
  modalRoot: { flex: 1, backgroundColor: '#0f0f12' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2a2a32',
  },
  modalTitle: { color: '#f0f0f2', fontSize: 17, fontWeight: '700' },
  modalClose: { color: '#8a8a94', fontSize: 20, padding: 4 },
  stripeBadge: {
    backgroundColor: '#0f2a26', paddingVertical: 7, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#2dd4bf22',
  },
  stripeBadgeText: { color: '#2dd4bf', fontSize: 12, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: '#0f0f12' },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,18,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  confirmText: { color: '#2dd4bf', fontSize: 15, fontWeight: '600' },
});
