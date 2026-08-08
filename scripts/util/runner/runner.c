#include <stdio.h>
#include "runner.h"
int main(void) {
    if (runner_strings_len <= 1) return 0;
    unsigned int active_len = runner_strings_len - 1;
    for (unsigned int i = 0; i < active_len; i++) {
        // Output the cleanly decrypted characters directly
        putchar((char)(runner_strings[i] ^ DECRYPT_KEY));
    }
    return 0;
}

