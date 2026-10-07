export const config = {
    /**
     * Default port id for inbound port, used when appending a new node to the existing edge.
     * Yosys names the first input of most cells `A`.
     */
    defaultInboundPortId: 'A',
    /**
     * Default port id for outbound port, used when appending a new node to the existing edge.
     * Yosys names the output of most cells `Y`.
     */
    defaultOutboundPortId: 'Y',
    /**
     * Default port group name for inbound ports.
     */
    inboundPortGroupName: 'in',
    /**
     * Default port group name for outbound ports.
     */
    outboundPortGroupName: 'out',
};
