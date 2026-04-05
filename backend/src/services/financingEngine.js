function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function simulate({
  principal,
  rate,
  months,
}) {
  const price = simulatePRICE({ principal, rate, months });
  const sac = simulateSAC({ principal, rate, months });

  return {
    price,
    sac,
  };
}

function simulatePRICE({ principal, rate, months }) {
  const i = rate;
  const n = months;

  const pmt =
    (principal * (i * Math.pow(1 + i, n))) /
    (Math.pow(1 + i, n) - 1);

  let totalPaid = 0;

  for (let k = 1; k <= n; k++) {
    totalPaid += pmt;
  }

  return {
    installment: round(pmt),
    totalPaid: round(totalPaid),
    totalInterest: round(totalPaid - principal),
  };
}

function simulateSAC({ principal, rate, months }) {
  const amort = principal / months;
  let balance = principal;

  let firstInstallment = 0;
  let lastInstallment = 0;
  let totalPaid = 0;

  for (let k = 1; k <= months; k++) {
    const interest = balance * rate;
    const installment = amort + interest;

    if (k === 1) firstInstallment = installment;
    if (k === months) lastInstallment = installment;

    totalPaid += installment;
    balance -= amort;
  }

  return {
    firstInstallment: round(firstInstallment),
    lastInstallment: round(lastInstallment),
    totalPaid: round(totalPaid),
    totalInterest: round(totalPaid - principal),
  };
}