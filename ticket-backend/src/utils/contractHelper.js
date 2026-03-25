// utils/contractHelper.js
const { Organization } = require('../models/associations');

// Call this on login or in a middleware
exports.checkContractStatus = async (organizationId) => {
  const org = await Organization.findByPk(organizationId);
  if (!org) return false;

  const today = new Date();
  const endDate = new Date(org.contract_end_date);

  if (org.contract_end_date && today > endDate) {
    // Auto-expire the contract
    await org.update({ contract_status: 'expired', is_active: false });
    return false; // contract expired
  }

  return true; // contract valid
};